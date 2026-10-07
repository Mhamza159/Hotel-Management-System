const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const AuditLog = require('../models/AuditLog');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../config/constants');
const ApiError = require('../utils/apiError');

/**
 * ============================================================================
 * ANALYTICS SERVICE (MGMT-02)
 * ============================================================================
 * 
 * Yeh service Hotel General Managers aur Financial Controllers ke liye
 * real-time operational aur financial analytics pipelines provide karti hai:
 * 
 * 1. Revenue Metrics: Total Revenue, Net Revenue, ADR (Average Daily Rate), aur RevPAR.
 * 2. Occupancy Metrics: Given date par physical room utilization percentage.
 */
class AnalyticsService {
  /**
   * Calculates comprehensive revenue, ADR, and RevPAR metrics for a given date range.
   * 
   * Formulas:
   * - Total Revenue: Sum of completed payments
   * - Rooms Sold: Sum of (rooms.length * nights) for bookings in range
   * - ADR (Average Daily Rate): Total Room Revenue / Rooms Sold
   * - RevPAR (Revenue Per Available Room): Total Room Revenue / (Total Active Rooms * Days in Range)
   * 
   * @param {Object} params
   * @param {string|Date} [params.from] - Start date
   * @param {string|Date} [params.to] - End date
   * @returns {Promise<Object>}
   */
  static async getRevenueMetrics({ from, to } = {}) {
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days default

    toDate.setHours(23, 59, 59, 999);
    fromDate.setHours(0, 0, 0, 0);

    if (fromDate > toDate) {
      throw ApiError.badRequest("'from' date cannot be after 'to' date");
    }

    // 1. Payment Aggregation Pipeline (Total Revenue & Refunds)
    const paymentPipeline = [
      {
        $match: {
          createdAt: { $gte: fromDate, $lte: toDate },
        },
      },
      {
        $group: {
          _id: null,
          totalCollected: {
            $sum: {
              $cond: [{ $eq: ['$status', PAYMENT_STATUS.COMPLETED] }, '$amount', 0],
            },
          },
          totalRefunded: {
            $sum: {
              $cond: [{ $eq: ['$status', PAYMENT_STATUS.REFUNDED] }, '$amount', 0],
            },
          },
          completedTransactions: {
            $sum: {
              $cond: [{ $eq: ['$status', PAYMENT_STATUS.COMPLETED] }, 1, 0],
            },
          },
        },
      },
    ];

    // 2. Active Bookings in Range (Rooms Sold and Room Revenue calculation)
    const bookingPipeline = [
      {
        $match: {
          status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CHECKED_IN, BOOKING_STATUS.CHECKED_OUT, BOOKING_STATUS.COMPLETED] },
          checkInDate: { $lte: toDate },
          checkOutDate: { $gte: fromDate },
        },
      },
      {
        $project: {
          totalPrice: 1,
          roomsCount: { $size: '$rooms' },
          checkInDate: 1,
          checkOutDate: 1,
        },
      },
    ];

    const [paymentStats, bookings, totalActiveRooms] = await Promise.all([
      Payment.aggregate(paymentPipeline),
      Booking.aggregate(bookingPipeline),
      Room.countDocuments({ isDeleted: false, isActive: true }),
    ]);

    const financialData = paymentStats[0] || {
      totalCollected: 0,
      totalRefunded: 0,
      completedTransactions: 0,
    };

    const totalRevenue = financialData.totalCollected;
    const totalRefunded = financialData.totalRefunded;
    const netRevenue = Math.max(0, totalRevenue - totalRefunded);

    // Calculate total room nights sold across matching bookings
    let totalRoomsSold = 0;
    let roomRevenueSum = 0;

    for (const b of bookings) {
      const start = Math.max(new Date(b.checkInDate).getTime(), fromDate.getTime());
      const end = Math.min(new Date(b.checkOutDate).getTime(), toDate.getTime());
      const nights = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
      totalRoomsSold += (b.roomsCount || 1) * nights;
      roomRevenueSum += b.totalPrice || 0;
    }

    // Number of days in requested range
    const daysInRange = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)));

    // ADR = Room Revenue / Rooms Sold
    const adr = totalRoomsSold > 0 ? Number((roomRevenueSum / totalRoomsSold).toFixed(2)) : 0;

    // Total Available Room Nights = Active Rooms * Days in Range
    const totalAvailableRoomNights = Math.max(1, totalActiveRooms * daysInRange);

    // RevPAR = Total Room Revenue / Total Available Room Nights
    const revPAR = totalActiveRooms > 0 ? Number((roomRevenueSum / totalAvailableRoomNights).toFixed(2)) : 0;

    return {
      period: {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0],
        days: daysInRange,
      },
      financials: {
        totalRevenue,
        totalRefunded,
        netRevenue,
        completedTransactions: financialData.completedTransactions,
      },
      hospitalityMetrics: {
        totalActiveRooms,
        totalRoomsSold,
        adr, // Average Daily Rate ($)
        revPAR, // Revenue Per Available Room ($)
      },
    };
  }

  /**
   * Computes hotel physical room occupancy rate for a specific date.
   * 
   * @param {Object} params
   * @param {string|Date} [params.date] - Target evaluation date (default: today)
   * @returns {Promise<Object>}
   */
  static async getOccupancyMetrics({ date } = {}) {
    const targetDate = date ? new Date(date) : new Date();

    if (isNaN(targetDate.getTime())) {
      throw ApiError.badRequest('Invalid date format');
    }

    // Find all active rooms
    const totalRooms = await Room.countDocuments({ isDeleted: false, isActive: true });

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Find bookings that encompass this date and are occupied or confirmed
    const activeBookings = await Booking.find({
      status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CHECKED_IN] },
      checkInDate: { $lte: endOfDay },
      checkOutDate: { $gte: startOfDay },
    }).select('rooms');

    let occupiedRoomsCount = 0;
    for (const b of activeBookings) {
      occupiedRoomsCount += b.rooms?.length || 0;
    }

    const occupiedRooms = Math.min(totalRooms, occupiedRoomsCount);
    const availableRooms = Math.max(0, totalRooms - occupiedRooms);
    const occupancyRate = totalRooms > 0 ? Number(((occupiedRooms / totalRooms) * 100).toFixed(1)) : 0;

    return {
      date: targetDate.toISOString().split('T')[0],
      totalRooms,
      occupiedRooms,
      availableRooms,
      occupancyRate, // percentage (e.g. 75.5%)
    };
  }

  /**
   * ==========================================================================
   * METHOD: searchPayment (Manager Financial Transaction & Audit Log Lookup)
   * ==========================================================================
   * 
   * [URDU / HINGLISH EXPLANATION]:
   * Manager Analytics page par kisi bhi Payment ID, Booking Ref, ya POS Slip se
   * search karke payment ki poori tafseelat (Kisne pay ki, kitni ki, aur kisne receive ki)
   * aur us payment se linked tamam Security Audit Trail events nikaal kar deta hai.
   * 
   * @param {string} query - Payment ID, Booking Reference, or POS Slip
   * @returns {Promise<Object>} { payment, auditLogs }
   */
  static async searchPayment(query) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      throw ApiError.badRequest('Please enter a valid Payment ID or Booking Reference to search.');
    }

    const trimmed = query.trim();
    let payment = null;

    // 1. Try finding by MongoDB ObjectId (Payment ID)
    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      payment = await Payment.findById(trimmed);
    }

    // 2. Try finding by transactionReference / slip
    if (!payment) {
      payment = await Payment.findOne({
        transactionReference: new RegExp(`^${trimmed}$`, 'i'),
      });
    }

    // 3. Try finding by Booking Reference
    if (!payment) {
      const booking = await Booking.findOne({
        bookingReference: new RegExp(`^${trimmed}$`, 'i'),
      });
      if (booking) {
        payment = await Payment.findOne({ bookingId: booking._id }).sort({ createdAt: -1 });
      }
    }

    if (!payment) {
      throw ApiError.notFound(`No financial payment record found matching '${trimmed}'.`);
    }

    // Populate relations (Payer, Staff Collector, and Suite Details)
    await payment.populate('userId', 'name email phone role');
    await payment.populate('receivedByStaffId', 'name email role');
    await payment.populate({
      path: 'bookingId',
      select: 'bookingReference status checkInDate checkOutDate totalPrice paidAmount guestInfo rooms',
      populate: {
        path: 'rooms.roomId',
        select: 'roomNumber type pricePerNight',
      },
    });

    // Query associated audit trail entries
    const bookingId = payment.bookingId?._id || payment.bookingId;
    const auditLogs = await AuditLog.find({
      $or: [
        { targetId: payment._id },
        { targetType: 'Payment', 'afterState.bookingId': bookingId },
        { targetId: bookingId, action: { $regex: /payment|walk-in/i } },
      ],
    })
      .populate('actorId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    return {
      payment,
      auditLogs: auditLogs || [],
    };
  }
}

module.exports = AnalyticsService;

