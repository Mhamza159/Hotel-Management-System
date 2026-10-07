const request = require("supertest");
const app = require("../../src/app");
const dbHelper = require("../fixtures/db-helper");
const Room = require("../../src/models/Room");
const Booking = require("../../src/models/Booking");
const User = require("../../src/models/User");
const Payment = require("../../src/models/Payment");
const { generateAccessToken } = require("../../src/middlewares/auth.middleware");
const { ROLES, BOOKING_STATUS, PAYMENT_STATUS, PERMISSIONS } = require("../../src/config/constants");

/**
 * ============================================================================
 * FRONT DESK OPERATIONS & STAFF PAYMENTS INTEGRATION TESTS
 * ============================================================================
 * 
 * Yeh test suite Phase 4 ke tamam zaroori requirements ko verify karti hai:
 * 1. Check-In: Receptionist ka confirmed booking ko check-in karna.
 * 2. Unconfirmed Check-in Rejection: Pending ya cancelled booking par 400 error aana.
 * 3. Financial Settlement Guard on Check-out:
 *    Agar guest ka bill baqi hai toh check-out block hona (400 Bad Request).
 * 4. In-person Cash & Offline Card Payment Intake:
 *    Cash lene par Payment document banna aur 'receivedByStaffId' me receptionist ka ID stamp hona.
 * 5. Check-Out & Housekeeping Integration:
 *    Payment mukammal hone ke baad checkout successful hona aur physical rooms ka status 'dirty' ho jana.
 * 6. PBAC Security Guards:
 *    Aam guest ka front desk actions (check-in, check-out, record payment) attempt karne par 403 Forbidden aana.
 * 7. Operational Overview Dashboard:
 *    Arrivals aur Departures ki list query params ke sath fetch hona.
 */
describe("Front Desk Operations & Staff Payments Integration Tests", () => {
  let testRoom;
  let guestUser, guestToken;
  let receptionistUser, receptionistToken;
  let unauthorizedGuestUser, unauthorizedGuestToken;

  beforeAll(async () => {
    // In-memory MongoDB replica set test harness initialize karein
    await dbHelper.connect();
  });

  afterAll(async () => {
    // Database connection safely close karein
    await dbHelper.disconnect();
  });

  beforeEach(async () => {
    // Har test se pehle database clean karein taake isolation rahe
    await dbHelper.clearDatabase();
    await Room.init();
    await Booking.init();
    await User.init();
    await Payment.init();

    // 1. Test room create karein
    testRoom = await Room.create({
      roomNumber: "D-101",
      type: "deluxe",
      description: "Deluxe Front Desk Test Room",
      capacity: 2,
      pricePerNight: 100,
      housekeepingStatus: "clean",
      isActive: true,
      isDeleted: false,
    });

    // 2. Receptionist staff user create karein (with default receptionist permissions)
    receptionistUser = await User.create({
      name: "Front Desk Officer",
      email: "receptionist@hotel.com",
      password: "Password123!",
      role: ROLES.RECEPTIONIST,
    });
    receptionistToken = generateAccessToken(receptionistUser);

    // 3. Normal guest user create karein
    guestUser = await User.create({
      name: "John Guest",
      email: "john@hotel.com",
      password: "Password123!",
      role: ROLES.GUEST,
    });
    guestToken = generateAccessToken(guestUser);

    // 4. Unauthorized user create karein
    unauthorizedGuestUser = await User.create({
      name: "Intruder User",
      email: "intruder@hotel.com",
      password: "Password123!",
      role: ROLES.GUEST,
    });
    unauthorizedGuestToken = generateAccessToken(unauthorizedGuestUser);
  });

  // ==========================================================================
  // TEST SUITE 1: ROOM ALLOTMENT & GUEST CHECK-IN WORKFLOW
  // ==========================================================================
  describe("PATCH /api/v1/desk/bookings/:id/allot-rooms & check-in", () => {
    it("allows receptionist to allot physical rooms and recalculates total price", async () => {
      const room2 = await Room.create({
        roomNumber: "D-102",
        type: "deluxe",
        description: "Alternative Deluxe Room",
        capacity: 2,
        pricePerNight: 150,
        housekeepingStatus: "clean",
        isActive: true,
        isDeleted: false,
      });

      const booking = await Booking.create({
        bookingReference: "BK-TEST-ALLOT-01",
        userId: guestUser._id,
        rooms: [{ roomId: testRoom._id, pricePerNight: 100 }],
        checkInDate: new Date("2026-12-05"),
        checkOutDate: new Date("2026-12-07"), // 2 nights
        numberOfGuests: 2,
        totalPrice: 200,
        totalAmount: 200,
        status: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.PENDING,
      });

      const res = await request(app)
        .patch(`/api/v1/desk/bookings/${booking._id}/allot-rooms`)
        .set("Authorization", `Bearer ${receptionistToken}`)
        .send({
          allocations: [
            {
              slotIndex: 0,
              allocatedRoomId: room2._id.toString(),
              pricingPolicy: "recalculate",
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rooms[0].roomId._id.toString()).toBe(room2._id.toString());
      expect(res.body.data.rooms[0].pricePerNight).toBe(150);
      expect(res.body.data.rooms[0].isAllocated).toBe(true);
      expect(res.body.data.totalPrice).toBe(300); // 2 nights * $150
    });

    it("rejects check-in if zero payment is recorded (400 Bad Request)", async () => {
      const booking = await Booking.create({
        bookingReference: "BK-TEST-CHK-NOPAY",
        userId: guestUser._id,
        rooms: [{ roomId: testRoom._id, pricePerNight: 100, isAllocated: true }],
        checkInDate: new Date("2026-12-01"),
        checkOutDate: new Date("2026-12-03"),
        numberOfGuests: 2,
        totalPrice: 200,
        totalAmount: 200,
        paidAmount: 0,
        status: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.PENDING,
      });

      const res = await request(app)
        .patch(`/api/v1/desk/bookings/${booking._id}/check-in`)
        .set("Authorization", `Bearer ${receptionistToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Cannot check in guest without payment");
    });

    it("allows receptionist to check in a confirmed booking after recording partial payment (200 OK)", async () => {
      // Confirmed booking create karein
      const booking = await Booking.create({
        bookingReference: "BK-TEST-CHK-01",
        userId: guestUser._id,
        rooms: [{ roomId: testRoom._id, pricePerNight: 100, isAllocated: true }],
        checkInDate: new Date("2026-12-01"),
        checkOutDate: new Date("2026-12-03"),
        numberOfGuests: 2,
        totalPrice: 200,
        totalAmount: 200,
        paidAmount: 50, // Partial payment of $50 recorded
        status: BOOKING_STATUS.CONFIRMED,
        paymentStatus: "partially-paid",
      });

      // Record corresponding completed payment
      await Payment.create({
        bookingId: booking._id,
        userId: guestUser._id,
        amount: 50,
        currency: "USD",
        paymentMethod: "cash",
        status: PAYMENT_STATUS.COMPLETED,
        receivedByStaffId: receptionistUser._id,
      });

      const res = await request(app)
        .patch(`/api/v1/desk/bookings/${booking._id}/check-in`)
        .set("Authorization", `Bearer ${receptionistToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(BOOKING_STATUS.CHECKED_IN);

      // Verify database
      const dbBooking = await Booking.findById(booking._id);
      expect(dbBooking.status).toBe(BOOKING_STATUS.CHECKED_IN);
    });

    it("rejects check-in if booking status is not confirmed (400 Bad Request)", async () => {
      // Pending booking create karein
      const booking = await Booking.create({
        bookingReference: "BK-TEST-CHK-02",
        userId: guestUser._id,
        rooms: [{ roomId: testRoom._id, pricePerNight: 100 }],
        checkInDate: new Date("2026-12-01"),
        checkOutDate: new Date("2026-12-03"),
        numberOfGuests: 2,
        totalPrice: 200,
        totalAmount: 200,
        status: BOOKING_STATUS.PENDING,
      });

      const res = await request(app)
        .patch(`/api/v1/desk/bookings/${booking._id}/check-in`)
        .set("Authorization", `Bearer ${receptionistToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Only 'confirmed' bookings can be checked in");
    });

    it("rejects check-in attempt by a regular guest (403 Forbidden)", async () => {
      const booking = await Booking.create({
        bookingReference: "BK-TEST-CHK-03",
        userId: guestUser._id,
        rooms: [{ roomId: testRoom._id, pricePerNight: 100 }],
        checkInDate: new Date("2026-12-01"),
        checkOutDate: new Date("2026-12-03"),
        numberOfGuests: 2,
        totalPrice: 200,
        totalAmount: 200,
        paidAmount: 200,
        status: BOOKING_STATUS.CONFIRMED,
      });

      const res = await request(app)
        .patch(`/api/v1/desk/bookings/${booking._id}/check-in`)
        .set("Authorization", `Bearer ${guestToken}`); // Regular guest token

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Forbidden");
    });
  });

  // ==========================================================================
  // TEST SUITE 2: IN-PERSON DESK PAYMENT RECORDING
  // ==========================================================================
  describe("POST /api/v1/desk/bookings/:id/payments", () => {
    it("records in-person cash payment with receivedByStaffId attribution and marks booking paid", async () => {
      const booking = await Booking.create({
        bookingReference: "BK-TEST-PAY-01",
        userId: guestUser._id,
        rooms: [{ roomId: testRoom._id, pricePerNight: 100 }],
        checkInDate: new Date("2026-12-01"),
        checkOutDate: new Date("2026-12-03"),
        numberOfGuests: 2,
        totalPrice: 200,
        totalAmount: 200,
        status: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.PENDING,
      });

      const res = await request(app)
        .post(`/api/v1/desk/bookings/${booking._id}/payments`)
        .set("Authorization", `Bearer ${receptionistToken}`)
        .send({
          amount: 200,
          paymentMethod: "cash",
          transactionReference: "RCPT-9876",
          notes: "Settled in full in cash at check-in",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payment.amount).toBe(200);
      expect(res.body.data.payment.receivedByStaffId.toString()).toBe(receptionistUser._id.toString());
      expect(res.body.data.bookingSummary.paymentStatus).toBe(PAYMENT_STATUS.COMPLETED);
      expect(res.body.data.bookingSummary.remainingBalance).toBe(0);

      // Verify payment in database
      const dbPayment = await Payment.findOne({ bookingId: booking._id });
      expect(dbPayment).not.toBeNull();
      expect(dbPayment.receivedByStaffId.toString()).toBe(receptionistUser._id.toString());
    });

    it("rejects invalid payment method at desk (400 Bad Request)", async () => {
      const booking = await Booking.create({
        bookingReference: "BK-TEST-PAY-02",
        userId: guestUser._id,
        rooms: [{ roomId: testRoom._id, pricePerNight: 100 }],
        checkInDate: new Date("2026-12-01"),
        checkOutDate: new Date("2026-12-03"),
        numberOfGuests: 2,
        totalPrice: 200,
        totalAmount: 200,
        status: BOOKING_STATUS.CONFIRMED,
      });

      const res = await request(app)
        .post(`/api/v1/desk/bookings/${booking._id}/payments`)
        .set("Authorization", `Bearer ${receptionistToken}`)
        .send({
          amount: 200,
          paymentMethod: "crypto_currency", // Invalid
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================================================
  // TEST SUITE 3: GUEST CHECK-OUT & UNPAID BILL GUARD
  // ==========================================================================
  describe("PATCH /api/v1/desk/bookings/:id/check-out", () => {
    it("BLOCKS checkout if guest has an unpaid balance (400 Bad Request)", async () => {
      // Checked-in booking with unpaid bill
      const booking = await Booking.create({
        bookingReference: "BK-TEST-CHKOUT-01",
        userId: guestUser._id,
        rooms: [{ roomId: testRoom._id, pricePerNight: 100 }],
        checkInDate: new Date("2026-12-01"),
        checkOutDate: new Date("2026-12-03"),
        numberOfGuests: 2,
        totalPrice: 200,
        totalAmount: 200,
        status: BOOKING_STATUS.CHECKED_IN,
        paymentStatus: PAYMENT_STATUS.PENDING, // Bill not paid!
      });

      const res = await request(app)
        .patch(`/api/v1/desk/bookings/${booking._id}/check-out`)
        .set("Authorization", `Bearer ${receptionistToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Cannot check out guest with outstanding balance");

      // Verify room status remains clean/unaffected
      const room = await Room.findById(testRoom._id);
      expect(room.housekeepingStatus).toBe("clean");
    });

    it("BLOCKS checkout if guest only paid partially (400 Bad Request)", async () => {
      const booking = await Booking.create({
        bookingReference: "BK-TEST-CHKOUT-PARTIAL",
        userId: guestUser._id,
        rooms: [{ roomId: testRoom._id, pricePerNight: 100 }],
        checkInDate: new Date("2026-12-01"),
        checkOutDate: new Date("2026-12-03"),
        numberOfGuests: 2,
        totalPrice: 200,
        totalAmount: 200,
        paidAmount: 80, // Only $80 paid out of $200
        status: BOOKING_STATUS.CHECKED_IN,
        paymentStatus: "partially-paid",
      });

      await Payment.create({
        bookingId: booking._id,
        userId: guestUser._id,
        amount: 80,
        currency: "USD",
        paymentMethod: "cash",
        status: PAYMENT_STATUS.COMPLETED,
        receivedByStaffId: receptionistUser._id,
      });

      const res = await request(app)
        .patch(`/api/v1/desk/bookings/${booking._id}/check-out`)
        .set("Authorization", `Bearer ${receptionistToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("outstanding balance");
    });

    it("allows checkout when fully paid and automatically marks room as dirty (200 OK)", async () => {
      // Checked-in booking
      const booking = await Booking.create({
        bookingReference: "BK-TEST-CHKOUT-02",
        userId: guestUser._id,
        rooms: [{ roomId: testRoom._id, pricePerNight: 100 }],
        checkInDate: new Date("2026-12-01"),
        checkOutDate: new Date("2026-12-03"),
        numberOfGuests: 2,
        totalPrice: 200,
        totalAmount: 200,
        status: BOOKING_STATUS.CHECKED_IN,
        paymentStatus: PAYMENT_STATUS.COMPLETED,
      });

      // Record matching payment
      await Payment.create({
        bookingId: booking._id,
        userId: guestUser._id,
        amount: 200,
        currency: "USD",
        paymentMethod: "cash",
        status: PAYMENT_STATUS.COMPLETED,
        receivedByStaffId: receptionistUser._id,
      });

      const res = await request(app)
        .patch(`/api/v1/desk/bookings/${booking._id}/check-out`)
        .set("Authorization", `Bearer ${receptionistToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(BOOKING_STATUS.CHECKED_OUT);

      // HOUSEKEEPING AUTOMATION VERIFICATION:
      // Verify room housekeepingStatus transitioned to 'dirty'
      const room = await Room.findById(testRoom._id);
      expect(room.housekeepingStatus).toBe("dirty");
    });
  });

  // ==========================================================================
  // TEST SUITE 4: OPERATIONAL OVERVIEW
  // ==========================================================================
  describe("GET /api/v1/desk/bookings", () => {
    it("returns arrivals and in-house overview for front desk staff", async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      await Booking.create({
        bookingReference: "BK-DASH-01",
        userId: guestUser._id,
        rooms: [{ roomId: testRoom._id, pricePerNight: 100 }],
        checkInDate: today,
        checkOutDate: tomorrow,
        numberOfGuests: 1,
        totalPrice: 100,
        totalAmount: 100,
        status: BOOKING_STATUS.CONFIRMED,
      });

      const res = await request(app)
        .get("/api/v1/desk/bookings?type=arrivals")
        .set("Authorization", `Bearer ${receptionistToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bookings.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.pagination).toBeDefined();
    });
  });
});
