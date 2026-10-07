const BookingService = require('../services/booking.service');
const CancellationService = require('../services/cancellation.service');
const InvoiceService = require('../services/invoice.service');
const Booking = require('../models/Booking');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { ROLES } = require('../config/constants');

/**
 * ============================================================================
 * BOOKING CONTROLLER (HTTP Request Handler)
 * ============================================================================
 * 
 * Yeh controller client ki HTTP requests ko receive karta hai, parameters extract karta hai,
 * business logic ke liye `BookingService`, `CancellationService`, aur `InvoiceService`
 * ko call karta hai, aur standardize response return karta hai.
 */
class BookingController {
  /**
   * POST /api/v1/bookings
   * Nayi reservation create karne ka endpoint.
   * Protected: Sirf authenticated user (Guest) hi request bhej sakta hai.
   */
  static async createBooking(req, res, next) {
    try {
      // 1. Authenticated user ki ID auth.middleware ke zariye req.user me mojood hoti hai
      const userId = req.user._id;

      // 2. Request body se parameters nikaalein
      const {
        roomIds,
        rooms,
        checkInDate,
        checkOutDate,
        numberOfGuests,
        specialRequests,
        paymentMethod,
        couponCode,
        redeemLoyaltyPoints,
      } = req.body;

      // Extract roomIds from either roomIds array or rooms objects array
      const resolvedRoomIds =
        roomIds ||
        (Array.isArray(rooms)
          ? rooms.map((r) => (typeof r === 'string' ? r : r.roomId || r._id))
          : []);

      // 3. Idempotency Key header me se ya body me se nikaalein (Network retry protection)
      const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;

      // 4. Booking service ki atomic reservation method call karein
      const booking = await BookingService.createBooking({
        userId,
        roomIds: resolvedRoomIds,
        checkInDate,
        checkOutDate,
        numberOfGuests,
        specialRequests,
        paymentMethod,
        idempotencyKey,
        couponCode,
        redeemLoyaltyPoints,
      });

      // 5. Standard 201 Created response envelope return karein
      return ApiResponse.created(res, booking, 'Reservation created successfully');
    } catch (error) {
      // Koi bhi validation ya concurrency error error.middleware ko pass ho jayega
      next(error);
    }
  }

  /**
   * GET /api/v1/bookings/my
   * Logged-in guest ki apni bookings history fetch karne ka endpoint.
   * Query params: ?page=1&limit=10&status=confirmed
   */
  static async getMyBookings(req, res, next) {
    try {
      const userId = req.user._id;
      const result = await BookingService.getGuestBookings(userId, req.query);

      return ApiResponse.success(res, 200, result, 'Guest bookings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/bookings/:id
   * Kisi aik booking ki mukammal tafseelat dekhne ka endpoint.
   * Security: Sirf booking ka maalik ya hotel staff (receptionist/admin) hi dekh sakta hai.
   */
  static async getBookingById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const userRole = req.user.role;

      const booking = await BookingService.getBookingById(id, userId, userRole);

      return ApiResponse.success(res, 200, booking, 'Booking details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/bookings/:id/cancel-request
   * Guest apni active booking ke liye cancellation request submit karta hai.
   * Body: { reason: "Flight delayed / Medical emergency" }
   * 
   * Security & Policy:
   * - Sirf authenticated booking owner ya staff hi request submit kar sakta hai.
   * - Check-in hone ke baad cancellation request allow nahi hogi.
   * - Request submit hone par booking status 'cancellation-requested' ban jayega
   *   aur hotel front-desk inspection queue me chala jayega.
   */
  static async requestCancellation(req, res, next) {
    try {
      const { id: bookingId } = req.params;
      const userId = req.user._id;
      const userRole = req.user.role;
      const { reason } = req.body;

      const result = await CancellationService.requestCancellation({
        bookingId,
        userId,
        userRole,
        reason,
      });

      return ApiResponse.success(res, 200, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/bookings/:id/invoice
   * Booking ki printable PDF invoice real-time binary stream me generate karta hai.
   * 
   * Security & Permissions:
   * - Sirf booking ka owner (Guest) ya Hotel Staff (Receptionist / Super-Admin) hi download kar sakta hai.
   * - Stranger user ko 403 Forbidden return hoga.
   */
  static async downloadInvoice(req, res, next) {
    try {
      const { id: bookingId } = req.params;
      const userId = req.user._id;
      const userRole = req.user.role;

      // 1. Security & Ownership Guard
      const booking = await Booking.findById(bookingId).select('bookingReference userId');
      if (!booking) {
        throw ApiError.notFound(`Booking with ID '${bookingId}' not found`);
      }

      const isOwner = booking.userId.toString() === userId.toString();
      const isStaff = userRole === ROLES.RECEPTIONIST || userRole === ROLES.SUPER_ADMIN;

      if (!isOwner && !isStaff) {
        throw ApiError.forbidden('You do not have permission to view or download this invoice');
      }

      // 2. Binary Streaming HTTP Headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="Invoice-${booking.bookingReference}.pdf"`
      );

      // 3. Pipe direct into Express response stream
      await InvoiceService.generateInvoice(bookingId, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BookingController;
