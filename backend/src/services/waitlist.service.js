const Waitlist = require('../models/Waitlist');
const NotificationService = require('./notification.service');
const ApiError = require('../utils/apiError');

/**
 * ============================================================================
 * WAITLIST SERVICE (ENGAGE-03)
 * ============================================================================
 * 
 * Yeh service sold-out rooms ke availability waitlists ko manage karti hai.
 * 
 * Key Principles:
 * 1. Guest Waitlist Queue: Agar room dates sold-out hon to guest queue join kar sakta hai.
 * 2. Automated Dispatch: Cancellation ya expired booking release hone par matching waitlisted
 *    guests ko notification deliver ki jaati hai aur status 'notified' set ho jata hai.
 */
class WaitlistService {
  /**
   * Joins the availability waitlist for a specific room type and date range.
   * 
   * @param {Object} params
   * @param {string} params.guestId
   * @param {string} params.roomType
   * @param {string|Date} params.checkIn
   * @param {string|Date} params.checkOut
   * @returns {Promise<Object>} Created waitlist entry
   */
  static async joinWaitlist({ guestId, roomType, checkIn, checkOut }) {
    const validRoomTypes = ['single', 'double', 'deluxe', 'suite', 'presidential'];
    const normalizedType = roomType?.toLowerCase();

    if (!validRoomTypes.includes(normalizedType)) {
      throw ApiError.badRequest(`Invalid room type: ${roomType}`);
    }

    if (!checkIn || !checkOut) {
      throw ApiError.badRequest('Both checkIn and checkOut dates are required');
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      throw ApiError.badRequest('Invalid date format for checkIn or checkOut');
    }

    if (checkInDate >= checkOutDate) {
      throw ApiError.badRequest('checkOut must be strictly after checkIn');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkInDate < today) {
      throw ApiError.badRequest('checkIn date cannot be in the past');
    }

    // Check for existing active waitlist entry for the same user, room type, and overlapping dates
    const existing = await Waitlist.findOne({
      guestId,
      roomType: normalizedType,
      status: 'active',
      checkIn: { $lt: checkOutDate },
      checkOut: { $gt: checkInDate },
    });

    if (existing) {
      throw ApiError.conflict('You already have an active waitlist entry for this room type and overlapping dates');
    }

    const entry = await Waitlist.create({
      guestId,
      roomType: normalizedType,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      status: 'active',
    });

    return entry;
  }

  /**
   * Retrieves all waitlist entries for a specific guest.
   * 
   * @param {string} guestId
   * @returns {Promise<Array>}
   */
  static async getGuestWaitlists(guestId) {
    return Waitlist.find({ guestId }).sort({ createdAt: -1 }).lean();
  }

  /**
   * Cancels a guest's active waitlist entry.
   * 
   * @param {string} waitlistId
   * @param {string} guestId
   * @returns {Promise<Object>}
   */
  static async cancelWaitlist(waitlistId, guestId) {
    const entry = await Waitlist.findOne({ _id: waitlistId, guestId });
    if (!entry) {
      throw ApiError.notFound('Waitlist entry not found');
    }

    if (entry.status !== 'active') {
      throw ApiError.badRequest(`Cannot cancel waitlist entry with status '${entry.status}'`);
    }

    entry.status = 'cancelled';
    await entry.save();

    return entry;
  }

  /**
   * Automatically scans and notifies active waitlist entries matching a freed room & dates.
   * Triggered upon cancellation approval or expired booking release.
   * 
   * @param {Object} params
   * @param {string} params.roomType - Type of room that became free
   * @param {Date} params.checkInDate - Start of freed date range
   * @param {Date} params.checkOutDate - End of freed date range
   * @param {Object} [params.room] - Room document
   * @returns {Promise<number>} Number of notified entries
   */
  static async notifyMatchingWaitlists({ roomType, checkInDate, checkOutDate, room = null }) {
    if (!roomType || !checkInDate || !checkOutDate) {
      return 0;
    }

    const normalizedType = roomType.toLowerCase();

    // Find all active waitlist entries whose desired range overlaps with the freed dates
    const matchingEntries = await Waitlist.find({
      roomType: normalizedType,
      status: 'active',
      checkIn: { $lt: new Date(checkOutDate) },
      checkOut: { $gt: new Date(checkInDate) },
    }).populate('guestId', 'name email phone');

    for (const entry of matchingEntries) {
      NotificationService.notifyWaitlistAvailable({ waitlistEntry: entry, room });
      entry.status = 'notified';
      entry.notifiedAt = new Date();
      await entry.save();
    }

    return matchingEntries.length;
  }
}

module.exports = WaitlistService;
