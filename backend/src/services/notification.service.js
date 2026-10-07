const logger = require("../utils/logger");

/**
 * ============================================================================
 * NOTIFICATION SERVICE (Event Notification & Guest Communication Engine)
 * ============================================================================
 *
 * Yeh service hotel reservation system ke mukhtalif events (jaise cancellation request,
 * approval, rejection, aur refunds) par guest aur staff ko muttala (notify) karti hai.
 *
 * Architecture & Design Benefits:
 * 1. Decoupled Interface:
 *    Cancellation logic ko yeh fikar karne ki zaroorat nahi ke notification email se ja rahi hai,
 *    SMS se, ya WebSockets se. Wo sirf is service ko call karta hai.
 * 2. Pluggable Adapters (Future-Ready):
 *    Filhal yeh service hamare Winston logger ke zariye structured alert record karti hai.
 *    Aainda kal agar aap Nodemailer (Email), Twilio (SMS), ya Socket.io lagana chahein,
 *    toh sirf is service ke andar implementation badalni hogi, controllers ko cherna nahi parega.
 * 3. Auditability:
 *    Har notification ka timestamp, target user, aur booking reference log hoti hai.
 */
class NotificationService {
  /**
   * Jab guest cancellation ki request bhejta hai toh acknowledgement dispatch karta hai.
   *
   * @param {Object} params
   * @param {Object} params.booking - Booking Mongoose document
   * @param {Object} [params.guest] - Guest User document (agar populated ho)
   * @param {string} params.reason - Cancellation ki darkhwast ki waja
   * @returns {Object} Dispatched notification receipt
   */
  static notifyCancellationRequested({ booking, guest, reason }) {
    const guestIdentifier = guest?.email || guest?.name || booking.userId;
    const message = `[NOTIFICATION: CANCELLATION REQUESTED] Guest (${guestIdentifier}) ne Booking '${booking.bookingReference}' ki cancellation darkhwast submit ki hai. Waja: '${reason}'. Request front-desk review ke liye pending hai.`;

    // Console / Log file me structured alert record karein:
    logger.info(message, {
      type: "CANCELLATION_REQUESTED",
      bookingReference: booking.bookingReference,
      bookingId: booking._id,
      userId: booking.userId,
      reason,
      timestamp: new Date(),
    });

    return {
      success: true,
      type: "CANCELLATION_REQUESTED",
      recipient: guestIdentifier,
      message,
      sentAt: new Date(),
    };
  }

  /**
   * Jab Receptionist ya Super-Admin cancellation ko manzoor (approve) kare,
   * toh yeh method guest ko refund aur approval ki final itteela deta hai.
   *
   * @param {Object} params
   * @param {Object} params.booking - Cancel shuda Booking document
   * @param {Object} [params.guest] - Guest document
   * @param {Object} params.refund - Refund details ({ appliedTier, refundAmount, refundPercentage })
   * @param {string} [params.approvedBy] - Staff user ID jisne approve kiya
   * @returns {Object} Dispatched notification receipt
   */
  static notifyCancellationApproved({ booking, guest, refund, approvedBy }) {
    const guestIdentifier = guest?.email || guest?.name || booking.userId;

    // Guest ke liye friendly aur wazeh paigham (message)
    const refundMessage =
      refund.refundAmount > 0
        ? `Aapko policy tier '${refund.appliedTier}' ke tehat $${refund.refundAmount} (${refund.refundPercentage}%) ka refund manzoor kiya gaya hai.`
        : `Policy tier '${refund.appliedTier}' ke mutabiq refund amount $0 hai.`;

    const message = `[NOTIFICATION: CANCELLATION APPROVED] Mohtaram Guest (${guestIdentifier}), aapki booking '${booking.bookingReference}' ki cancellation manzoor kar li gayi hai. ${refundMessage}`;

    // Structured logging:
    logger.info(message, {
      type: "CANCELLATION_APPROVED",
      bookingReference: booking.bookingReference,
      bookingId: booking._id,
      userId: booking.userId,
      appliedTier: refund.appliedTier,
      refundAmount: refund.refundAmount,
      approvedBy,
      timestamp: new Date(),
    });

    return {
      success: true,
      type: "CANCELLATION_APPROVED",
      recipient: guestIdentifier,
      message,
      refundDetails: refund,
      sentAt: new Date(),
    };
  }

  /**
   * Jab Receptionist ya Super-Admin cancellation request ko mustarad (reject) kare.
   *
   * @param {Object} params
   * @param {Object} params.booking - Booking document
   * @param {Object} [params.guest] - Guest document
   * @param {string} params.rejectionReason - Rejection ki waja
   * @param {string} [params.reviewedBy] - Staff user ID
   * @returns {Object} Dispatched notification receipt
   */
  static notifyCancellationRejected({
    booking,
    guest,
    rejectionReason,
    reviewedBy,
  }) {
    const guestIdentifier = guest?.email || guest?.name || booking.userId;
    const message = `[NOTIFICATION: CANCELLATION REJECTED] Mohtaram Guest (${guestIdentifier}), aapki booking '${booking.bookingReference}' ki cancellation darkhwast radd kar di gayi hai. Waja: '${rejectionReason}'. Aapki reservation barqarar hai.`;

    logger.warn(message, {
      type: "CANCELLATION_REJECTED",
      bookingReference: booking.bookingReference,
      bookingId: booking._id,
      userId: booking.userId,
      rejectionReason,
      reviewedBy,
      timestamp: new Date(),
    });

    return {
      success: true,
      type: "CANCELLATION_REJECTED",
      recipient: guestIdentifier,
      message,
      rejectionReason,
      sentAt: new Date(),
    };
  }

  /**
   * Jab koi room cancel ho kar ya unpaid release ho kar free ho jaye,
   * to matching waitlist entries ko alert notification bhejta hai.
   *
   * @param {Object} params
   * @param {Object} params.waitlistEntry - Waitlist document
   * @param {Object} [params.room] - Available Room document
   * @returns {Object} Dispatched notification receipt
   */
  static notifyWaitlistAvailable({ waitlistEntry, room }) {
    const guestIdentifier =
      waitlistEntry.guestId?.email ||
      waitlistEntry.guestId?.name ||
      waitlistEntry.guestId;

    const checkInStr = new Date(waitlistEntry.checkIn).toISOString().split("T")[0];
    const checkOutStr = new Date(waitlistEntry.checkOut).toISOString().split("T")[0];

    const message = `[NOTIFICATION: WAITLIST AVAILABLE] Guest (${guestIdentifier}), room type '${waitlistEntry.roomType}' (Room #${room?.roomNumber || "Available"}) is now available for dates ${checkInStr} to ${checkOutStr}! You can now complete your reservation.`;

    logger.info(message, {
      type: "WAITLIST_AVAILABLE",
      waitlistId: waitlistEntry._id,
      guestId: waitlistEntry.guestId,
      roomType: waitlistEntry.roomType,
      timestamp: new Date(),
    });

    return {
      success: true,
      type: "WAITLIST_AVAILABLE",
      recipient: guestIdentifier,
      message,
      sentAt: new Date(),
    };
  }

  /**
   * Dispatches password recovery link/token notification.
   *
   * @param {Object} params
   * @param {Object} params.user - User document
   * @param {string} params.resetToken - Plaintext reset token
   * @returns {Object} Dispatched notification receipt
   */
  static notifyPasswordReset({ user, resetToken }) {
    const message = `[NOTIFICATION: PASSWORD RESET] Password reset requested for ${user.email}. Reset token: ${resetToken}`;

    logger.info(message, {
      type: "PASSWORD_RESET",
      userId: user._id,
      email: user.email,
      resetToken,
      timestamp: new Date(),
    });

    return {
      success: true,
      type: "PASSWORD_RESET",
      recipient: user.email,
      message,
      sentAt: new Date(),
    };
  }
}

module.exports = NotificationService;
