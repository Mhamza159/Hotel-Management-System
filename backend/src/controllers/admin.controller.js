const AuditService = require('../services/audit.service');
const ApiResponse = require('../utils/apiResponse');
const Booking = require('../models/Booking');
const User = require('../models/User');

/**
 * ============================================================================
 * ADMIN CONTROLLER (MGMT-01: Audit Trail Administration & Global Oversight)
 * ============================================================================
 */
class AdminController {
  /**
   * GET /api/v1/admin/audit-log
   * Retrieves paginated audit logs with search/filter capabilities.
   * Gated: audit:view permission or Super-Admin bypass.
   */
  static async getAuditLogs(req, res, next) {
    try {
      const {
        page,
        limit,
        actorId,
        targetType,
        targetId,
        action,
        fromDate,
        toDate,
      } = req.query;

      const result = await AuditService.getAuditLogs({
        page,
        limit,
        actorId,
        targetType,
        targetId,
        action,
        fromDate,
        toDate,
      });

      return ApiResponse.success(res, 200, result, 'Audit logs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/bookings
   * Retrieves global paginated bookings with flexible filtering across statuses, dates, and search terms.
   * Gated: bookings:view permission or Super-Admin bypass.
   */
  static async getAllBookings(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        paymentStatus,
        fromDate,
        toDate,
        search,
      } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
      const skip = (pageNum - 1) * limitNum;

      const filter = {};

      if (status) {
        filter.status = status;
      }

      if (paymentStatus) {
        filter.paymentStatus = paymentStatus;
      }

      if (fromDate || toDate) {
        filter.checkInDate = {};
        if (fromDate) filter.checkInDate.$gte = new Date(fromDate);
        if (toDate) filter.checkInDate.$lte = new Date(toDate);
      }

      if (search) {
        const regex = new RegExp(search.trim(), 'i');
        const matchedUsers = await User.find({
          $or: [{ name: regex }, { email: regex }, { phone: regex }],
        }).select('_id');
        const userIds = matchedUsers.map((u) => u._id);

        filter.$or = [
          { bookingReference: regex },
          { userId: { $in: userIds } },
        ];
      }

      const [bookings, total] = await Promise.all([
        Booking.find(filter)
          .populate('userId', 'name email phone')
          .populate('rooms.roomId', 'roomNumber type pricePerNight')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        Booking.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limitNum) || 1;

      return ApiResponse.success(
        res,
        200,
        {
          bookings,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1,
          },
        },
        'All bookings retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminController;
