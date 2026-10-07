const DeskService = require("../services/desk.service");
const CancellationService = require("../services/cancellation.service");
const ApiResponse = require("../utils/apiResponse");

/**
 * ============================================================================
 * DESK CONTROLLER (Front Desk HTTP Interface & Request Dispatcher)
 * ============================================================================
 * 
 * Yeh controller front desk ke HTTP endpoints ko handle karta hai:
 * 1. Client (Receptionist dashboard / Postman) se aane wali requests receive karta hai.
 * 2. URL parameters (`req.params`), Request Body (`req.body`), aur Query Strings (`req.query`) extract karta hai.
 * 3. Logged-in receptionist ki identity (`req.user`) attach karke `DeskService` aur `CancellationService` ko call karta hai.
 * 4. Structured `ApiResponse` return karta hai, aur kisi bhi error ko Express ke `next(error)` pipeline me bhejta hai.
 */
class DeskController {
  /**
   * --------------------------------------------------------------------------
   * 1. CHECK-IN GUEST
   * --------------------------------------------------------------------------
   * PATCH /api/v1/desk/bookings/:id/check-in
   * 
   * Security Guard:
   * Requires JWT token + `checkin:manage` permission.
   * 
   * Flow:
   * URL se booking `:id` nikaal kar DeskService.checkInGuest ko pass karta hai.
   */
  static async checkIn(req, res, next) {
    try {
      // 1. URL parameter se booking ID nikaalein
      const { id: bookingId } = req.params;
      const { allocatedRoomId, roomId } = req.body || {};
      const targetRoomId = allocatedRoomId || roomId || null;

      // 2. Desk service ko call karein jo availability, cleanliness aur room allotment verify karegi
      const updatedBooking = await DeskService.checkInGuest(bookingId, targetRoomId);

      // 3. 200 OK success response return karein
      return ApiResponse.success(
        res,
        200,
        updatedBooking,
        "Guest successfully checked in. Room is now occupied."
      );
    } catch (error) {
      // Validation ya operational error centralized error handler ko pass karein
      next(error);
    }
  }

  /**
   * --------------------------------------------------------------------------
   * 1B. ALLOT ROOMS (Physical Room Assignment & Dynamic Pricing)
   * --------------------------------------------------------------------------
   * PATCH /api/v1/desk/bookings/:id/allot-rooms
   * 
   * Security Guard:
   * Requires JWT token + `checkin:manage` permission.
   */
  static async allotRooms(req, res, next) {
    try {
      const { id: bookingId } = req.params;
      const { allocations } = req.body;

      const updatedBooking = await DeskService.allotRooms(bookingId, allocations);

      return ApiResponse.success(
        res,
        200,
        updatedBooking,
        "Rooms allocated successfully. Please collect payment before check-in."
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * --------------------------------------------------------------------------
   * 1C. GET ROOMS ALLOTMENT STATUS
   * --------------------------------------------------------------------------
   * GET /api/v1/desk/rooms-allotment-status
   * 
   * Fetches real-time status of all hotel rooms for front-desk allotment:
   * identifying occupied in-house rooms, booked rooms with booking references,
   * and clean available units.
   */
  static async getRoomsAllotmentStatus(req, res, next) {
    try {
      const { bookingId, checkInDate, checkOutDate } = req.query;
      const rooms = await DeskService.getRoomsAllotmentStatus({
        bookingId,
        checkInDate,
        checkOutDate,
      });

      return ApiResponse.success(
        res,
        200,
        rooms,
        `Retrieved allotment status for ${rooms.length} room(s)`
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * --------------------------------------------------------------------------
   * 2. CHECK-OUT GUEST
   * --------------------------------------------------------------------------
   * PATCH /api/v1/desk/bookings/:id/check-out
   * 
   * Security Guard:
   * Requires JWT token + `checkout:manage` permission.
   * 
   * Flow:
   * 1. Check karta hai ke guest ke sar koi pending payment toh nahi rehti.
   * 2. Booking ko 'checked-out' karta hai.
   * 3. Physical rooms ko automatically 'dirty' mark karta hai.
   */
  static async checkOut(req, res, next) {
    try {
      const { id: bookingId } = req.params;

      // Desk service checkout process execute karegi aur room statuses dirty karegi
      const updatedBooking = await DeskService.checkOutGuest(bookingId);

      return ApiResponse.success(
        res,
        200,
        updatedBooking,
        "Guest successfully checked out. Rooms marked as 'dirty' for housekeeping."
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * --------------------------------------------------------------------------
   * 3. RECORD IN-PERSON DESK PAYMENT
   * --------------------------------------------------------------------------
   * POST /api/v1/desk/bookings/:id/payments
   * 
   * Security Guard:
   * Requires JWT token + `payments:recordCash` (for cash) OR `payments:recordCard` (for card).
   * 
   * Flow:
   * Front desk par cash ya card slip se payment receive karke
   * `receivedByStaffId` me logged-in receptionist ka ID save karta hai.
   */
  static async recordPayment(req, res, next) {
    try {
      const { id: bookingId } = req.params;
      const { amount, paymentMethod, transactionReference, notes } = req.body;

      // Logged-in staff member ki ID auth.middleware se aati hai
      const staffId = req.user._id;
      const staffUser = req.user;

      const result = await DeskService.recordInPersonPayment({
        bookingId,
        amount,
        paymentMethod,
        transactionReference,
        notes,
        staffId,
        staffUser,
      });

      // 201 Created status ke sath payment record aur updated balance return karein
      return ApiResponse.created(
        res,
        result,
        "Payment successfully recorded with staff attribution."
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * --------------------------------------------------------------------------
   * 4. GET OPERATIONAL OVERVIEW
   * --------------------------------------------------------------------------
   * GET /api/v1/desk/bookings
   * 
   * Query Parameters:
   * - type: 'arrivals' | 'departures' | 'in-house'
   * - date: 'YYYY-MM-DD'
   * - status: 'confirmed' | 'checked-in' | 'checked-out'
   * - page: number (default: 1)
   * - limit: number (default: 10)
   * 
   * Security Guard:
   * Requires JWT token + `bookings:view` permission.
   */
  static async getOverview(req, res, next) {
    try {
      const result = await DeskService.getOperationalOverview(req.query);

      return ApiResponse.success(
        res,
        200,
        result,
        "Operational bookings overview retrieved successfully."
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * --------------------------------------------------------------------------
   * 5. GET PENDING CANCELLATION REQUESTS
   * --------------------------------------------------------------------------
   * GET /api/v1/desk/cancellation-requests
   * 
   * Security Guard:
   * Requires JWT token + `bookings:view` permission.
   */
  static async getCancellationRequests(req, res, next) {
    try {
      const result = await CancellationService.getPendingCancellationRequests(req.query);

      return ApiResponse.success(
        res,
        200,
        result,
        "Pending cancellation requests retrieved successfully."
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * --------------------------------------------------------------------------
   * 6. GET CANCELLATION REVIEW DETAILS
   * --------------------------------------------------------------------------
   * GET /api/v1/desk/bookings/:id/cancellation-review
   * 
   * Inspection screen jo dikhati hai:
   * - Kab booking hui thi
   * - Kitna time guzar gaya (Time Elapsed)
   * - Check-in me kitna waqt baqi hai
   * - Kitna advance pay hua
   * - Kaunsi refund policy apply hogi
   * 
   * Security Guard:
   * Requires JWT token + `bookings:cancel` permission.
   */
  static async getCancellationReview(req, res, next) {
    try {
      const { id: bookingId } = req.params;

      const reviewDetails = await CancellationService.getCancellationReviewDetails(
        bookingId
      );

      return ApiResponse.success(
        res,
        200,
        reviewDetails,
        "Cancellation review and policy evaluation retrieved successfully."
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * --------------------------------------------------------------------------
   * 7. APPROVE CANCELLATION
   * --------------------------------------------------------------------------
   * PATCH /api/v1/desk/bookings/:id/cancel-approve
   * 
   * Receptionist ya Super-Admin cancellation ko manzoor karta hai:
   * - Policy tier ke tehat authoritative refund
   * - Room date locks unlock
   * - Financial refund ledger record
   * - Guest ko automated notification
   * 
   * Security Guard:
   * Requires JWT token + `bookings:cancel` permission.
   */
  static async approveCancellation(req, res, next) {
    try {
      const { id: bookingId } = req.params;
      const staffId = req.user._id;
      const staffRole = req.user.role;
      const { notes } = req.body;

      const result = await CancellationService.approveCancellation({
        bookingId,
        staffId,
        staffRole,
        notes,
      });

      return ApiResponse.success(res, 200, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * --------------------------------------------------------------------------
   * 8. REJECT CANCELLATION
   * --------------------------------------------------------------------------
   * PATCH /api/v1/desk/bookings/:id/cancel-reject
   * 
   * Staff request ko reject karta hai aur reason provide karta hai:
   * - Status reverts back to confirmed
   * - Guest receives rejection notification
   * 
   * Security Guard:
   * Requires JWT token + `bookings:cancel` permission.
   */
  static async rejectCancellation(req, res, next) {
    try {
      const { id: bookingId } = req.params;
      const staffId = req.user._id;
      const staffRole = req.user.role;
      const { rejectionReason } = req.body;

      const result = await CancellationService.rejectCancellation({
        bookingId,
        staffId,
        staffRole,
        rejectionReason,
      });

      return ApiResponse.success(res, 200, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * --------------------------------------------------------------------------
   * 9. CREATE WALK-IN GUEST RESERVATION
   * --------------------------------------------------------------------------
   * POST /api/v1/desk/walk-in
   * 
   * [URDU / HINGLISH EXPLANATION]:
   * Receptionist lobby mein anay walay walk-in guest ke liye direct booking
   * create karti hai with immediate check-in option and in-person payment settlement.
   * 
   * Security Guard:
   * Requires JWT token + `bookings:create` permission.
   */
  static async createWalkInBooking(req, res, next) {
    try {
      const actorId = req.user._id;
      const clientIp = req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;

      const booking = await DeskService.createWalkInBooking({
        actorId,
        clientIp,
        data: req.body,
      });

      return ApiResponse.created(
        res,
        booking,
        booking.status === 'checked-in'
          ? 'Walk-in guest registered and checked in successfully!'
          : 'Walk-in reservation confirmed successfully!'
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DeskController;

