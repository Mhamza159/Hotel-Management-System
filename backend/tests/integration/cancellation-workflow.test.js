const request = require("supertest");
const app = require("../../src/app");
const dbHelper = require("../fixtures/db-helper");
const Room = require("../../src/models/Room");
const Booking = require("../../src/models/Booking");
const User = require("../../src/models/User");
const Payment = require("../../src/models/Payment");
const { generateAccessToken } = require("../../src/middlewares/auth.middleware");
const {
  ROLES,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  ROLE_DEFAULT_PERMISSIONS,
} = require("../../src/config/constants");

/**
 * ============================================================================
 * TWO-STEP CANCELLATION & STAFF REVIEW/APPROVAL WORKFLOW INTEGRATION TESTS
 * ============================================================================
 *
 * Yeh integration test suite user ki mandate ke mutabiq complete 3-step workflow ko test karti hai:
 * 1. Guest Cancellation Request: Guest direct cancel nahi karta, darkhwast submit karta hai.
 * 2. Desk Inspection & Review: Staff dekhta hai kab booking hui, kitna time guzar gaya,
 *    advance kitna pay hua, aur konsi refund policy apply hogi.
 * 3. Desk Approval: Staff approve karta hai, refund ledger banta hai, rooms unlock hote hain,
 *    aur guest ko notification dispatch hota hai.
 * 4. Post-Check-in Guard: Check-in ke baad cancellation request block hoti hai.
 * 5. Desk Rejection: Staff request reject karta hai agar ghair-qanooni ho.
 */
describe("Two-Step Cancellation & Staff Approval Workflow Integration Tests", () => {
  let testRoom;
  let guestUser, guestToken;
  let otherGuestUser, otherGuestToken;
  let receptionistUser, receptionistToken;

  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterAll(async () => {
    await dbHelper.disconnect();
  });

  beforeEach(async () => {
    await dbHelper.clearDatabase();
    await Room.init();
    await Booking.init();
    await User.init();
    await Payment.init();

    // 1. Room create karein
    testRoom = await Room.create({
      roomNumber: "C-201",
      type: "deluxe",
      description: "Cancellation Test Room",
      capacity: 2,
      pricePerNight: 100,
      housekeepingStatus: "clean",
      isActive: true,
      isDeleted: false,
    });

    // 2. Primary Guest User
    guestUser = await User.create({
      name: "Ahmed Guest",
      email: "ahmed.guest@example.com",
      password: "Password123!",
      role: ROLES.GUEST,
      permissions: ROLE_DEFAULT_PERMISSIONS[ROLES.GUEST],
      isActive: true,
    });
    guestToken = generateAccessToken(guestUser);

    // 3. Other Guest (Unauthorized)
    otherGuestUser = await User.create({
      name: "Bilal Other",
      email: "bilal.other@example.com",
      password: "Password123!",
      role: ROLES.GUEST,
      permissions: ROLE_DEFAULT_PERMISSIONS[ROLES.GUEST],
      isActive: true,
    });
    otherGuestToken = generateAccessToken(otherGuestUser);

    // 4. Receptionist Staff
    receptionistUser = await User.create({
      name: "Fatima Receptionist",
      email: "fatima.desk@example.com",
      password: "Password123!",
      role: ROLES.RECEPTIONIST,
      permissions: ROLE_DEFAULT_PERMISSIONS[ROLES.RECEPTIONIST],
      isActive: true,
    });
    receptionistToken = generateAccessToken(receptionistUser);
  });

  /**
   * Helper: Confirmed booking create karna with room reserved range
   */
  async function createConfirmedBooking({ checkInDate, checkOutDate, totalPaid = 200 }) {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    // 2 nights * $100 = $200
    const booking = await Booking.create({
      bookingReference: `BK-${Date.now().toString(36).toUpperCase()}`,
      userId: guestUser._id,
      rooms: [{ roomId: testRoom._id, pricePerNight: 100 }],
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: 2,
      totalPrice: 200,
      status: BOOKING_STATUS.CONFIRMED,
      paymentStatus: totalPaid >= 200 ? PAYMENT_STATUS.COMPLETED : "unpaid",
    });

    // Room me reserved range lock lagayein
    await Room.findByIdAndUpdate(testRoom._id, {
      $push: {
        reservedRanges: {
          checkInDate: checkIn,
          checkOutDate: checkOut,
          bookingReference: booking.bookingReference,
        },
      },
    });

    // Agar advance pay hua ho toh Payment ledger me completed payment banayein
    if (totalPaid > 0) {
      await Payment.create({
        bookingId: booking._id,
        userId: guestUser._id,
        amount: totalPaid,
        currency: "USD",
        paymentMethod: "stripe",
        status: PAYMENT_STATUS.COMPLETED,
        notes: "Online advance payment",
      });
    }

    return booking;
  }

  // ==========================================================================
  // 1. GUEST REQUEST CANCELLATION
  // ==========================================================================
  describe("POST /api/v1/bookings/:id/cancel-request", () => {
    it("allows the booking owner to submit a cancellation request", async () => {
      // 5 din baad ka check-in
      const futureCheckIn = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const futureCheckOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const booking = await createConfirmedBooking({
        checkInDate: futureCheckIn,
        checkOutDate: futureCheckOut,
      });

      const response = await request(app)
        .post(`/api/v1/bookings/${booking._id}/cancel-request`)
        .set("Authorization", `Bearer ${guestToken}`)
        .send({ reason: "Emergency surgery scheduled" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(BOOKING_STATUS.CANCELLATION_REQUESTED);
      expect(response.body.data.cancellationRequest.reason).toBe("Emergency surgery scheduled");
      expect(response.body.data.cancellationRequest.status).toBe("pending");

      // Verify DB state
      const dbBooking = await Booking.findById(booking._id);
      expect(dbBooking.status).toBe(BOOKING_STATUS.CANCELLATION_REQUESTED);
    });

    it("prevents another guest from submitting a cancellation request (403 Forbidden)", async () => {
      const futureCheckIn = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const futureCheckOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const booking = await createConfirmedBooking({
        checkInDate: futureCheckIn,
        checkOutDate: futureCheckOut,
      });

      const response = await request(app)
        .post(`/api/v1/bookings/${booking._id}/cancel-request`)
        .set("Authorization", `Bearer ${otherGuestToken}`)
        .send({ reason: "Malicious cancellation attempt" });

      expect(response.status).toBe(403);
    });

    it("rejects cancellation request if guest has already checked in (400 Bad Request)", async () => {
      const futureCheckIn = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const futureCheckOut = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
      const booking = await createConfirmedBooking({
        checkInDate: futureCheckIn,
        checkOutDate: futureCheckOut,
      });

      // Manually set status to checked-in
      booking.status = BOOKING_STATUS.CHECKED_IN;
      await booking.save();

      const response = await request(app)
        .post(`/api/v1/bookings/${booking._id}/cancel-request`)
        .set("Authorization", `Bearer ${guestToken}`)
        .send({ reason: "Want to cancel after checkin" });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Cannot request cancellation after check-in");
    });
  });

  // ==========================================================================
  // 2. DESK REVIEW & INSPECTION SCREEN
  // ==========================================================================
  describe("GET /api/v1/desk/bookings/:id/cancellation-review", () => {
    it("returns comprehensive review details: booking date, elapsed time, and evaluated policy tier", async () => {
      // 3 din (72 hours) baad check-in: > 48 hours pehle cancel karne par 100% tier
      const checkInDate = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const checkOutDate = new Date(Date.now() + 96 * 60 * 60 * 1000);
      const booking = await createConfirmedBooking({
        checkInDate,
        checkOutDate,
        totalPaid: 200,
      });

      // Guest submits cancellation request
      await request(app)
        .post(`/api/v1/bookings/${booking._id}/cancel-request`)
        .set("Authorization", `Bearer ${guestToken}`)
        .send({ reason: "Change of travel plans" });

      // Receptionist views inspection details
      const response = await request(app)
        .get(`/api/v1/desk/bookings/${booking._id}/cancellation-review`)
        .set("Authorization", `Bearer ${receptionistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data;
      expect(data.bookingReference).toBe(booking.bookingReference);
      expect(data.guest.email).toBe("ahmed.guest@example.com");

      // Timeline & Elapsed time verification
      expect(data.timeline.bookedAt).toBeDefined();
      expect(data.timeline.timeElapsedSinceBooking).toBeDefined();
      expect(data.timeline.requestDetails.reason).toBe("Change of travel plans");
      expect(data.timeline.requestDetails.requestStatus).toBe("pending");

      // Financials & Policy Tier verification (> 48h -> 100% tier)
      expect(data.financials.totalPaid).toBe(200);
      expect(data.refundPolicyEvaluation.applicableTier).toBe("100%");
      expect(data.refundPolicyEvaluation.refundPercentage).toBe(100);
      expect(data.refundPolicyEvaluation.estimatedRefundAmount).toBe(200);
    });

    it("evaluates 50% tier when check-in is between 24 and 48 hours away", async () => {
      // 30 hours baad check-in: between 24 and 48 hours -> 50% tier
      const checkInDate = new Date(Date.now() + 30 * 60 * 60 * 1000);
      const checkOutDate = new Date(Date.now() + 54 * 60 * 60 * 1000);
      const booking = await createConfirmedBooking({
        checkInDate,
        checkOutDate,
        totalPaid: 200,
      });

      const response = await request(app)
        .get(`/api/v1/desk/bookings/${booking._id}/cancellation-review`)
        .set("Authorization", `Bearer ${receptionistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.refundPolicyEvaluation.applicableTier).toBe("50%");
      expect(response.body.data.refundPolicyEvaluation.estimatedRefundAmount).toBe(100);
    });

    it("denies access to normal guests (403 Forbidden)", async () => {
      const checkInDate = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const checkOutDate = new Date(Date.now() + 96 * 60 * 60 * 1000);
      const booking = await createConfirmedBooking({ checkInDate, checkOutDate });

      const response = await request(app)
        .get(`/api/v1/desk/bookings/${booking._id}/cancellation-review`)
        .set("Authorization", `Bearer ${guestToken}`);

      expect(response.status).toBe(403);
    });
  });

  // ==========================================================================
  // 3. DESK APPROVAL & INVENTORY UNLOCK
  // ==========================================================================
  describe("PATCH /api/v1/desk/bookings/:id/cancel-approve", () => {
    it("approves cancellation, unlocks room inventory, creates refund payment ledger, and updates status", async () => {
      // 72 hours away -> 100% refund tier
      const checkInDate = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const checkOutDate = new Date(Date.now() + 96 * 60 * 60 * 1000);
      const booking = await createConfirmedBooking({
        checkInDate,
        checkOutDate,
        totalPaid: 200,
      });

      // Guest submits cancellation request
      await request(app)
        .post(`/api/v1/bookings/${booking._id}/cancel-request`)
        .set("Authorization", `Bearer ${guestToken}`)
        .send({ reason: "Medical emergency" });

      // Room reservedRanges check karein (locked hona chahiye)
      let roomInDb = await Room.findById(testRoom._id);
      expect(roomInDb.reservedRanges.length).toBe(1);

      // Staff approves cancellation
      const response = await request(app)
        .patch(`/api/v1/desk/bookings/${booking._id}/cancel-approve`)
        .set("Authorization", `Bearer ${receptionistToken}`)
        .send({ notes: "Medical documents verified by front desk" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(BOOKING_STATUS.CANCELLED);
      expect(response.body.data.refund.appliedTier).toBe("100%");
      expect(response.body.data.refund.refundAmount).toBe(200);

      // 1. Room Inventory Check: reservedRanges must be cleared ($pull)
      roomInDb = await Room.findById(testRoom._id);
      expect(roomInDb.reservedRanges.length).toBe(0);

      // 2. Booking DB Check
      const dbBooking = await Booking.findById(booking._id);
      expect(dbBooking.status).toBe(BOOKING_STATUS.CANCELLED);
      expect(dbBooking.cancellationRequest.status).toBe("approved");
      expect(dbBooking.cancellation.appliedTier).toBe("100%");
      expect(dbBooking.cancellation.refundAmount).toBe(200);

      // 3. Payment Ledger Check: 'refunded' payment entry must exist
      const refundRecord = await Payment.findOne({
        bookingId: booking._id,
        status: PAYMENT_STATUS.REFUNDED,
      });
      expect(refundRecord).toBeDefined();
      expect(refundRecord.amount).toBe(200);
    });

    it("handles cancellation with $0 refund for unpaid bookings", async () => {
      const checkInDate = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const checkOutDate = new Date(Date.now() + 96 * 60 * 60 * 1000);
      const booking = await createConfirmedBooking({
        checkInDate,
        checkOutDate,
        totalPaid: 0, // Unpaid booking
      });

      const response = await request(app)
        .patch(`/api/v1/desk/bookings/${booking._id}/cancel-approve`)
        .set("Authorization", `Bearer ${receptionistToken}`)
        .send({ notes: "Unpaid reservation cancelled" });

      expect(response.status).toBe(200);
      expect(response.body.data.refund.refundAmount).toBe(0);

      // No refund payment record created
      const refundRecord = await Payment.findOne({
        bookingId: booking._id,
        status: PAYMENT_STATUS.REFUNDED,
      });
      expect(refundRecord).toBeNull();
    });
  });

  // ==========================================================================
  // 4. DESK REJECTION ENDPOINT
  // ==========================================================================
  describe("PATCH /api/v1/desk/bookings/:id/cancel-reject", () => {
    it("rejects cancellation request, keeps booking confirmed, and notes rejection reason", async () => {
      const checkInDate = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const checkOutDate = new Date(Date.now() + 96 * 60 * 60 * 1000);
      const booking = await createConfirmedBooking({ checkInDate, checkOutDate });

      // Guest submits request
      await request(app)
        .post(`/api/v1/bookings/${booking._id}/cancel-request`)
        .set("Authorization", `Bearer ${guestToken}`)
        .send({ reason: "Unjustified reason" });

      // Desk rejects request
      const response = await request(app)
        .patch(`/api/v1/desk/bookings/${booking._id}/cancel-reject`)
        .set("Authorization", `Bearer ${receptionistToken}`)
        .send({ rejectionReason: "Non-refundable corporate promo rate" });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(BOOKING_STATUS.CONFIRMED);
      expect(response.body.data.cancellationRequest.status).toBe("rejected");
      expect(response.body.data.cancellationRequest.rejectionReason).toBe(
        "Non-refundable corporate promo rate"
      );

      // Room still locked
      const roomInDb = await Room.findById(testRoom._id);
      expect(roomInDb.reservedRanges.length).toBe(1);
    });
  });
});
