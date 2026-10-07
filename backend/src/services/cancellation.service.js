const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const Payment = require("../models/Payment");
const RefundService = require("./refund.service");
const NotificationService = require("./notification.service");
const ApiError = require("../utils/apiError");
const {
  BOOKING_STATUS,
  PAYMENT_STATUS,
  ROLES,
} = require("../config/constants");
const WaitlistService = require("./waitlist.service");

/**
 * ============================================================================
 * CANCELLATION SERVICE (Reservation Lifecycle, Review & Refund Engine)
 * ============================================================================
 *
 * Yeh service Hotel Booking Cancellation ke enterprise-grade 3-stage lifecycle
 * ko manage karti hai:
 *
 * Stage 1: Guest darkhwast submit karta hai (`requestCancellation`)
 * Stage 2: Front-Desk / Admin poori booking, guzra waqt aur policy review karta hai (`getCancellationReviewDetails`)
 * Stage 3: Staff manzoor (approve) karta hai -> refund ledger, room unlock aur notification dispatch (`approveCancellation`)
 */
class CancellationService {
  /**
   * Helper utility jo 2 tareekhon ke darmayan guzray huye waqt ko
   * insani samajh me aane wale (human-readable) lafzon me tabdeel karta hai.
   *
   * @param {Date|string} fromDate - Shuruati tareekh (e.g. booking.createdAt)
   * @param {Date|string} [toDate=new Date()] - Aakhri tareekh (default: mojooda waqt)
   * @returns {Object} { totalMinutes, totalHours, totalDays, formatted }
   */
  static formatTimeElapsed(fromDate, toDate = new Date()) {
    const start = new Date(fromDate).getTime();
    const end = new Date(toDate).getTime();
    const diffMs = Math.max(0, end - start);

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);

    const remainingHours = totalHours % 24;
    const remainingMinutes = totalMinutes % 60;

    let formatted = "";
    if (totalDays > 0) {
      formatted = `${totalDays} day${totalDays > 1 ? "s" : ""} ${remainingHours} hr${
        remainingHours !== 1 ? "s" : ""
      } ago`;
    } else if (totalHours > 0) {
      formatted = `${totalHours} hr${totalHours !== 1 ? "s" : ""} ${remainingMinutes} min${
        remainingMinutes !== 1 ? "s" : ""
      } ago`;
    } else {
      formatted = `${totalMinutes} min${totalMinutes !== 1 ? "s" : ""} ago`;
    }

    return {
      totalMinutes,
      totalHours,
      totalDays,
      formatted,
    };
  }

  /**
   * Front-desk / Admin ke liye un tamam bookings ki list lata hai
   * jinki cancellation request pending hai.
   *
   * @param {Object} query - { page, limit }
   * @returns {Promise<Object>} Bookings with pagination
   */
  static async getPendingCancellationRequests(query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = { status: BOOKING_STATUS.CANCELLATION_REQUESTED };

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("userId", "name email phone")
        .populate("rooms.roomId", "roomNumber type pricePerNight")
        .sort({ "cancellationRequest.requestedAt": -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    return {
      bookings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==========================================================================
  // STAGE 1: GUEST CANCELLATION REQUEST (Darkhwast Submission)
  // ==========================================================================
  /**
   * Guest apni active booking ke liye cancellation request submit karta hai.
   *
   * @param {Object} params
   * @param {string} params.bookingId - Booking MongoDB ObjectId
   * @param {string} params.userId - Request karne wale user ki ID
   * @param {string} params.userRole - Request karne wale user ka role
   * @param {string} params.reason - Cancel karne ki waja
   * @returns {Promise<Object>} Updated booking request receipt
   */
  static async requestCancellation({ bookingId, userId, userRole, reason }) {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw ApiError.badRequest("Invalid booking ID format");
    }

    if (!reason || reason.trim().length === 0) {
      throw ApiError.badRequest("Cancellation reason is required");
    }

    const booking = await Booking.findById(bookingId).populate(
      "userId",
      "name email phone"
    );
    if (!booking) {
      throw ApiError.notFound(`Booking with ID '${bookingId}' not found`);
    }

    // 1. Ownership Guard: Sirf booking ka maalik ya staff hi darkhwast bhej sakta hai
    const isOwner = booking.userId._id.toString() === userId.toString();
    const isStaff =
      userRole === ROLES.RECEPTIONIST || userRole === ROLES.SUPER_ADMIN;

    if (!isOwner && !isStaff) {
      throw ApiError.forbidden(
        "You do not have permission to request cancellation for this booking"
      );
    }

    // 2. Lifecycle Guards:
    if (booking.status === BOOKING_STATUS.CANCELLED) {
      throw ApiError.badRequest("This booking has already been cancelled");
    }

    if (booking.status === BOOKING_STATUS.CANCELLATION_REQUESTED) {
      throw ApiError.badRequest(
        "A cancellation request is already pending review for this booking"
      );
    }

    // Pre-Check-in Guard: Agar guest pehle hi check-in ho chuka hai toh cancellation block karein
    if (booking.status === BOOKING_STATUS.CHECKED_IN) {
      throw ApiError.badRequest(
        "Cannot request cancellation after check-in. Please contact the front desk for check-out."
      );
    }

    if (
      booking.status === BOOKING_STATUS.CHECKED_OUT ||
      booking.status === BOOKING_STATUS.COMPLETED
    ) {
      throw ApiError.badRequest("Cannot cancel a completed past reservation");
    }

    // Check-in tareekh guzarne ke baad cancellation block
    if (new Date(booking.checkInDate).getTime() <= Date.now()) {
      throw ApiError.badRequest(
        "Cannot request cancellation after the scheduled check-in time has passed."
      );
    }

    // 3. State update: Status ko 'cancellation-requested' karein
    booking.status = BOOKING_STATUS.CANCELLATION_REQUESTED;
    booking.cancellationRequest = {
      requestedAt: new Date(),
      requestedBy: userId,
      reason: reason.trim(),
      status: "pending",
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
    };

    await booking.save();

    // 4. Notification trigger: Guest aur desk log ko alert bhejein
    NotificationService.notifyCancellationRequested({
      booking,
      guest: booking.userId,
      reason: reason.trim(),
    });

    return {
      success: true,
      message:
        "Cancellation request submitted successfully. Hotel staff will review your request.",
      bookingId: booking._id,
      bookingReference: booking.bookingReference,
      status: booking.status,
      cancellationRequest: booking.cancellationRequest,
    };
  }

  // ==========================================================================
  // STAGE 2: STAFF REVIEW DETAILS (Desk / Super-Admin Inspection Screen)
  // ==========================================================================
  /**
   * Front-desk receptionist ya Super-Admin ke liye poori booking details,
   * kab booking hui, kitna time guzar gaya, aur refund policy calculate karke deta hai.
   *
   * @param {string} bookingId - Booking ObjectId
   * @returns {Promise<Object>} Complete detailed review payload
   */
  static async getCancellationReviewDetails(bookingId) {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw ApiError.badRequest("Invalid booking ID format");
    }

    const booking = await Booking.findById(bookingId)
      .populate("userId", "name email phone")
      .populate("rooms.roomId", "roomNumber type pricePerNight capacity");

    if (!booking) {
      throw ApiError.notFound(`Booking with ID '${bookingId}' not found`);
    }

    // 1. Kab Booking Hui Aur Kitna Time Guzra (Time Elapsed Calculation)
    const timeElapsedSinceBooking = this.formatTimeElapsed(
      booking.createdAt,
      new Date()
    );

    // Agar guest ne cancellation request bheji ho, toh request submit huye kitna waqt hua
    let timeElapsedSinceRequest = null;
    if (booking.cancellationRequest?.requestedAt) {
      timeElapsedSinceRequest = this.formatTimeElapsed(
        booking.cancellationRequest.requestedAt,
        new Date()
      );
    }

    // 2. Check-in ke waqt tak kitna time baqi hai
    const now = Date.now();
    const checkInMs = new Date(booking.checkInDate).getTime();
    const msUntilCheckIn = checkInMs - now;
    const hoursUntilCheckIn = Math.round((msUntilCheckIn / (1000 * 60 * 60)) * 10) / 10;

    // 3. Database se advance payments fetch karein
    const completedPayments = await Payment.find({
      bookingId: booking._id,
      status: PAYMENT_STATUS.COMPLETED,
    });
    const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);

    // 4. Live Authoritative Refund Policy Tier Evaluation
    const refundEvaluation = RefundService.calculateRefundTier({
      checkInDate: booking.checkInDate,
      totalPaid,
    });

    return {
      bookingId: booking._id,
      bookingReference: booking.bookingReference,
      status: booking.status,
      // Guest Profile Details
      guest: {
        id: booking.userId?._id,
        name: booking.userId?.name,
        email: booking.userId?.email,
        phone: booking.userId?.phone,
      },
      // Timeline & Elapsed Time Metrics (Aapki Khas Requirement)
      timeline: {
        bookedAt: booking.createdAt,
        timeElapsedSinceBooking: timeElapsedSinceBooking.formatted,
        totalHoursSinceBooking: timeElapsedSinceBooking.totalHours,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        hoursUntilCheckIn,
        requestDetails: booking.cancellationRequest
          ? {
              requestedAt: booking.cancellationRequest.requestedAt,
              timeElapsedSinceRequest: timeElapsedSinceRequest?.formatted,
              reason: booking.cancellationRequest.reason,
              requestStatus: booking.cancellationRequest.status,
            }
          : null,
      },
      // Kamron ki tafseelat
      rooms: booking.rooms.map((r) => ({
        roomId: r.roomId?._id,
        roomNumber: r.roomId?.roomNumber,
        type: r.roomId?.type,
        pricePerNight: r.pricePerNight,
      })),
      // Financial Summary & Policy Tier Evaluation
      financials: {
        totalPrice: booking.totalPrice,
        totalPaid,
        balanceRemaining: Math.max(0, booking.totalPrice - totalPaid),
        paymentStatus: booking.paymentStatus,
      },
      // Authoritative Policy Evaluation jo staff screen par display hogi
      refundPolicyEvaluation: {
        applicableTier: refundEvaluation.appliedTier,
        refundPercentage: refundEvaluation.refundPercentage,
        estimatedRefundAmount: refundEvaluation.refundAmount,
        policyExplanation: refundEvaluation.message,
      },
    };
  }

  // ==========================================================================
  // STAGE 3: STAFF APPROVAL & REFUND EXECUTION (Manzoori Aur Refund Settlement)
  // ==========================================================================
  /**
   * Receptionist ya Super-Admin cancellation ko approve karta hai.
   * Yeh method refund calculate karega, rooms unlock karega, aur guest ko notify karega.
   *
   * @param {Object} params
   * @param {string} params.bookingId - Booking ObjectId
   * @param {string} params.staffId - Approve karne wale staff user ki ID
   * @param {string} params.staffRole - Staff ka role (receptionist ya super-admin)
   * @param {string} [params.notes] - Staff ke audit notes
   * @returns {Promise<Object>} Final approval receipt
   */
  static async approveCancellation({
    bookingId,
    staffId,
    staffRole,
    notes,
  }) {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw ApiError.badRequest("Invalid booking ID format");
    }

    // 1. Staff RBAC Guard: Sirf receptionist ya super-admin approve kar sakte hain
    const isAuthorizedStaff =
      staffRole === ROLES.RECEPTIONIST || staffRole === ROLES.SUPER_ADMIN;
    if (!isAuthorizedStaff) {
      throw ApiError.forbidden(
        "Only front-desk staff or super-admins are authorized to approve cancellations."
      );
    }

    const booking = await Booking.findById(bookingId).populate(
      "userId",
      "name email phone"
    );
    if (!booking) {
      throw ApiError.notFound(`Booking with ID '${bookingId}' not found`);
    }

    // 2. Lifecycle Status Guard:
    if (booking.status === BOOKING_STATUS.CANCELLED) {
      throw ApiError.badRequest("This booking is already cancelled.");
    }

    if (booking.status === BOOKING_STATUS.CHECKED_IN) {
      throw ApiError.badRequest(
        "Cannot cancel a booking after guest has already checked in."
      );
    }

    // 3. Calculate advance payment
    const completedPayments = await Payment.find({
      bookingId: booking._id,
      status: PAYMENT_STATUS.COMPLETED,
    });
    const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);

    // 4. Authoritative Refund Tier calculation
    const refundData = RefundService.calculateRefundTier({
      checkInDate: booking.checkInDate,
      totalPaid,
    });

    // 5. Atomic Room Inventory Unlock (Kamray ko doosre guests ke liye foran available karna)
    const roomIds = booking.rooms.map((r) => r.roomId);
    if (roomIds.length > 0) {
      await Room.updateMany(
        { _id: { $in: roomIds } },
        {
          $pull: {
            reservedRanges: { bookingReference: booking.bookingReference },
          },
        }
      );
    }

    // 6. Booking status update
    booking.status = BOOKING_STATUS.CANCELLED;

    // Cancellation request sub-document update
    if (booking.cancellationRequest) {
      booking.cancellationRequest.status = "approved";
      booking.cancellationRequest.reviewedBy = staffId;
      booking.cancellationRequest.reviewedAt = new Date();
    }

    // Final cancellation audit snapshot
    booking.cancellation = {
      cancelledAt: new Date(),
      cancelledBy: staffId,
      reason:
        notes ||
        booking.cancellationRequest?.reason ||
        "Cancelled with staff approval",
      appliedTier: refundData.appliedTier,
      refundAmount: refundData.refundAmount,
    };

    // Payment financial status update
    if (refundData.refundAmount > 0 && refundData.refundAmount >= totalPaid) {
      booking.paymentStatus = PAYMENT_STATUS.REFUNDED;
    } else if (refundData.refundAmount > 0) {
      booking.paymentStatus = "partially-paid";
    }

    await booking.save();

    // 7. Payment ledger me refund record create karein (Audit trail)
    let refundPaymentRecord = null;
    if (refundData.refundAmount > 0) {
      refundPaymentRecord = await Payment.create({
        bookingId: booking._id,
        userId: booking.userId._id || booking.userId,
        amount: refundData.refundAmount,
        currency: "USD",
        paymentMethod: completedPayments[0]?.paymentMethod || "cash",
        status: PAYMENT_STATUS.REFUNDED,
        receivedByStaffId: staffId,
        notes: `Refund approved under ${refundData.appliedTier} tier. Staff note: ${
          notes || "Approved"
        }`,
      });
    }

    // 8. Guest ko notification dispatch karein (Main Requirement)
    NotificationService.notifyCancellationApproved({
      booking,
      guest: booking.userId,
      refund: refundData,
      approvedBy: staffId,
    });

    // 9. Automatically notify matching waitlisted guests for freed inventory (ENGAGE-03)
    const freedRooms = await Room.find({ _id: { $in: roomIds } });
    for (const room of freedRooms) {
      await WaitlistService.notifyMatchingWaitlists({
        roomType: room.type,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        room,
      });
    }

    return {
      success: true,
      message: "Booking cancellation approved and processed successfully.",
      bookingId: booking._id,
      bookingReference: booking.bookingReference,
      status: booking.status,
      cancellation: booking.cancellation,
      totalPaid,
      refund: {
        appliedTier: refundData.appliedTier,
        refundPercentage: refundData.refundPercentage,
        refundAmount: refundData.refundAmount,
        message: refundData.message,
        refundPaymentId: refundPaymentRecord ? refundPaymentRecord._id : null,
      },
    };
  }

  // ==========================================================================
  // STAFF REJECTION (Darkhwast Mustarad Karna)
  // ==========================================================================
  /**
   * Front-desk staff agar kisi request ko ghalat paye toh reject kar sakta hai.
   *
   * @param {Object} params
   * @param {string} params.bookingId - Booking ObjectId
   * @param {string} params.staffId - Reject karne wale staff ki ID
   * @param {string} params.staffRole - Staff ka role
   * @param {string} params.rejectionReason - Rejection ki waja
   * @returns {Promise<Object>} Rejection receipt
   */
  static async rejectCancellation({
    bookingId,
    staffId,
    staffRole,
    rejectionReason,
  }) {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw ApiError.badRequest("Invalid booking ID format");
    }

    const isAuthorizedStaff =
      staffRole === ROLES.RECEPTIONIST || staffRole === ROLES.SUPER_ADMIN;
    if (!isAuthorizedStaff) {
      throw ApiError.forbidden(
        "Only front-desk staff or super-admins can reject cancellation requests."
      );
    }

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      throw ApiError.badRequest("Rejection reason is required");
    }

    const booking = await Booking.findById(bookingId).populate(
      "userId",
      "name email phone"
    );
    if (!booking) {
      throw ApiError.notFound(`Booking with ID '${bookingId}' not found`);
    }

    if (booking.status !== BOOKING_STATUS.CANCELLATION_REQUESTED) {
      throw ApiError.badRequest(
        `Cannot reject request. Booking is not in '${BOOKING_STATUS.CANCELLATION_REQUESTED}' status.`
      );
    }

    // Status ko wapas confirmed karein aur request ko reject mark karein
    booking.status = BOOKING_STATUS.CONFIRMED;
    if (booking.cancellationRequest) {
      booking.cancellationRequest.status = "rejected";
      booking.cancellationRequest.reviewedBy = staffId;
      booking.cancellationRequest.reviewedAt = new Date();
      booking.cancellationRequest.rejectionReason = rejectionReason.trim();
    }

    await booking.save();

    // Guest ko alert bhejein ke darkhwast radd kar di gayi hai
    NotificationService.notifyCancellationRejected({
      booking,
      guest: booking.userId,
      rejectionReason: rejectionReason.trim(),
      reviewedBy: staffId,
    });

    return {
      success: true,
      message: "Cancellation request rejected. Booking remains confirmed.",
      bookingId: booking._id,
      bookingReference: booking.bookingReference,
      status: booking.status,
      cancellationRequest: booking.cancellationRequest,
    };
  }
}

module.exports = CancellationService;
