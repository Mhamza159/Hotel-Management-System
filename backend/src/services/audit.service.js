const AuditLog = require('../models/AuditLog');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');
const ApiError = require('../utils/apiError');

/**
 * ============================================================================
 * AUDIT SERVICE (MGMT-01)
 * ============================================================================
 * 
 * Yeh service Hotel Management System ke immutable audit logs ko likhne (append)
 * aur search/filter karne ki central authority hai.
 */
class AuditService {
  /**
   * Extracts clean client IP address from Express request object.
   * 
   * @param {Object} req - Express request
   * @returns {string|null} Client IP address
   */
  static getClientIp(req) {
    if (!req) return null;
    return (
      req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      null
    );
  }

  /**
   * Appends an immutable audit log record.
   * 
   * @param {Object} params
   * @param {string} params.actorId - User ID who triggered the action
   * @param {string} params.action - Action identifier string (e.g. 'staff:permission-update')
   * @param {string} params.targetType - Target entity ('User', 'Room', 'Booking', 'Payment', 'System')
   * @param {string} params.targetId - Target entity ObjectId
   * @param {Object} [params.beforeState=null] - State snapshot before mutation
   * @param {Object} [params.afterState=null] - State snapshot after mutation
   * @param {string} [params.ipAddress=null] - Client IP address
   * @returns {Promise<Object>} Created AuditLog document
   */
  static async logAction({
    actorId,
    action,
    targetType,
    targetId,
    beforeState = null,
    afterState = null,
    ipAddress = null,
  }) {
    if (!actorId || !action || !targetType || !targetId) {
      logger.warn('[AUDIT SERVICE] Missing required audit parameters', {
        actorId,
        action,
        targetType,
        targetId,
      });
      return null;
    }

    try {
      const record = await AuditLog.create({
        actorId,
        action,
        targetType,
        targetId,
        beforeState,
        afterState,
        ipAddress,
        createdAt: new Date(),
      });

      logger.info(`[AUDIT LOG] ${action} on ${targetType} (${targetId}) by ${actorId}`, {
        auditId: record._id,
        action,
        targetType,
        targetId,
        actorId,
      });

      return record;
    } catch (error) {
      logger.error(`[AUDIT SERVICE ERROR] Failed to record audit log: ${error.message}`);
      // Do not crash primary business workflow if audit logging fails
      return null;
    }
  }

  /**
   * Retrieves paginated audit logs with flexible administrative filters.
   * 
   * @param {Object} filters
   * @param {number} [filters.page=1]
   * @param {number} [filters.limit=20]
   * @param {string} [filters.actorId]
   * @param {string} [filters.targetType]
   * @param {string} [filters.targetId]
   * @param {string} [filters.action]
   * @param {string|Date} [filters.fromDate]
   * @param {string|Date} [filters.toDate]
   * @returns {Promise<Object>}
   */
  static async getAuditLogs({
    page = 1,
    limit = 20,
    actorId,
    targetType,
    targetId,
    action,
    fromDate,
    toDate,
  } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    if (actorId) query.actorId = actorId;
    if (targetType) query.targetType = targetType;
    if (targetId) query.targetId = targetId;
    if (action) query.action = new RegExp(action, 'i');

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actorId', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    // Dynamic on-the-fly enrichment for payment logs lacking guest information
    const logsToEnrich = logs.filter(
      (l) =>
        (l.targetType === 'Payment' || l.action?.startsWith('payment:')) &&
        (!l.afterState?.guestName ||
          l.afterState?.guestName === 'Valued Guest' ||
          l.afterState?.guestName === 'Guest / Customer')
    );

    if (logsToEnrich.length > 0) {
      try {
        const bookingRefs = logsToEnrich
          .map((l) => l.afterState?.bookingReference)
          .filter(Boolean);
        const bookingIds = logsToEnrich
          .map((l) => l.afterState?.bookingId)
          .filter(Boolean);
        const paymentIds = logsToEnrich
          .map((l) => l.targetId)
          .filter(Boolean);

        const [bookings, payments] = await Promise.all([
          Booking.find({
            $or: [
              ...(bookingRefs.length > 0 ? [{ bookingReference: { $in: bookingRefs } }] : []),
              ...(bookingIds.length > 0 ? [{ _id: { $in: bookingIds } }] : []),
            ],
          })
            .populate('userId', 'name email phone')
            .lean(),
          Payment.find({ _id: { $in: paymentIds } })
            .populate('userId', 'name email phone')
            .populate('bookingId')
            .lean(),
        ]);

        const bookingMap = new Map();
        bookings.forEach((b) => {
          if (b.bookingReference) bookingMap.set(b.bookingReference, b);
          bookingMap.set(String(b._id), b);
        });

        const paymentMap = new Map();
        payments.forEach((p) => {
          paymentMap.set(String(p._id), p);
        });

        for (const log of logsToEnrich) {
          if (!log.afterState) log.afterState = {};

          const b =
            (log.afterState?.bookingReference && bookingMap.get(log.afterState.bookingReference)) ||
            (log.afterState?.bookingId && bookingMap.get(String(log.afterState.bookingId)));

          const p = log.targetId && paymentMap.get(String(log.targetId));

          const resolvedGuestName =
            b?.guestInfo?.fullName ||
            b?.userId?.name ||
            p?.userId?.name ||
            p?.bookingId?.guestInfo?.fullName ||
            null;

          const resolvedGuestPhone =
            b?.guestInfo?.phone ||
            b?.userId?.phone ||
            p?.userId?.phone ||
            p?.bookingId?.guestInfo?.phone ||
            null;

          const resolvedGuestEmail =
            b?.guestInfo?.email ||
            b?.userId?.email ||
            p?.userId?.email ||
            p?.bookingId?.guestInfo?.email ||
            null;

          if (resolvedGuestName) {
            log.afterState.guestName = resolvedGuestName;
          }
          if (resolvedGuestPhone && !log.afterState.guestPhone) {
            log.afterState.guestPhone = resolvedGuestPhone;
          }
          if (resolvedGuestEmail && !log.afterState.guestEmail) {
            log.afterState.guestEmail = resolvedGuestEmail;
          }
        }
      } catch (enrichErr) {
        logger.warn(`AuditLog guest enrichment skipped: ${enrichErr.message}`);
      }
    }

    return {
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
      },
    };
  }
}

module.exports = AuditService;
