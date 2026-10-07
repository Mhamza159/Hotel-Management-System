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
 * PDF INVOICE GENERATION & STREAMING INTEGRATION TESTS
 * ============================================================================
 *
 * Yeh integration test suite verify karti hai:
 * 1. Valid PDF Stream Generation:
 *    `GET /api/v1/bookings/:id/invoice` par 200 OK aana, `content-type: application/pdf`
 *    aur response body me valid PDF binary signature (`%PDF`) milna.
 * 2. Ownership & Privacy Guard:
 *    Sirf booking ka maalik (Guest) ya Hotel Staff (Receptionist / Super-Admin) hi
 *    invoice download kar sakte hain. Stranger user ko 403 Forbidden aana.
 * 3. Unauthenticated Guard:
 *    Bina login kiye request karne par 401 Unauthorized aana.
 */
describe("PDF Invoice Generation & Streaming Integration Tests", () => {
  let testRoom;
  let guestUser, guestToken;
  let otherGuestUser, otherGuestToken;
  let receptionistUser, receptionistToken;
  let testBooking;

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

    // 1. Test room
    testRoom = await Room.create({
      roomNumber: "INV-301",
      type: "deluxe",
      description: "Deluxe Suite for Invoice Test",
      capacity: 2,
      pricePerNight: 150,
      housekeepingStatus: "clean",
      isActive: true,
      isDeleted: false,
    });

    // 2. Primary Guest
    guestUser = await User.create({
      name: "Zainab Guest",
      email: "zainab.guest@example.com",
      password: "Password123!",
      role: ROLES.GUEST,
      permissions: ROLE_DEFAULT_PERMISSIONS[ROLES.GUEST],
      isActive: true,
    });
    guestToken = generateAccessToken(guestUser);

    // 3. Unauthorized other guest
    otherGuestUser = await User.create({
      name: "Imran Other",
      email: "imran.other@example.com",
      password: "Password123!",
      role: ROLES.GUEST,
      permissions: ROLE_DEFAULT_PERMISSIONS[ROLES.GUEST],
      isActive: true,
    });
    otherGuestToken = generateAccessToken(otherGuestUser);

    // 4. Receptionist staff
    receptionistUser = await User.create({
      name: "Kashif FrontDesk",
      email: "kashif.desk@example.com",
      password: "Password123!",
      role: ROLES.RECEPTIONIST,
      permissions: ROLE_DEFAULT_PERMISSIONS[ROLES.RECEPTIONIST],
      isActive: true,
    });
    receptionistToken = generateAccessToken(receptionistUser);

    // 5. Create a confirmed booking with 2 nights * $150 = $300
    testBooking = await Booking.create({
      bookingReference: "BK-INVOICE-TEST1",
      userId: guestUser._id,
      rooms: [{ roomId: testRoom._id, pricePerNight: 150 }],
      checkInDate: new Date("2026-12-10T14:00:00.000Z"),
      checkOutDate: new Date("2026-12-12T11:00:00.000Z"),
      numberOfGuests: 2,
      totalPrice: 300,
      status: BOOKING_STATUS.CONFIRMED,
      paymentStatus: PAYMENT_STATUS.COMPLETED,
    });

    // Advance payment record
    await Payment.create({
      bookingId: testBooking._id,
      userId: guestUser._id,
      amount: 300,
      currency: "USD",
      paymentMethod: "stripe",
      status: PAYMENT_STATUS.COMPLETED,
      notes: "Online card payment in full",
    });
  });

  // --------------------------------------------------------------------------
  // TEST 1: GUEST DOWNLOADS OWN INVOICE
  // --------------------------------------------------------------------------
  it("streams a valid binary PDF document to the booking owner (Guest)", async () => {
    const response = await request(app)
      .get(`/api/v1/bookings/${testBooking._id}/invoice`)
      .set("Authorization", `Bearer ${guestToken}`)
      .buffer(true) // Supertest buffer binary stream
      .parse((res, callback) => {
        // Collect binary chunks
        const data = [];
        res.on("data", (chunk) => data.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(data)));
      });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/pdf");
    expect(response.headers["content-disposition"]).toContain(
      `inline; filename="Invoice-${testBooking.bookingReference}.pdf"`
    );

    // Standard PDF files always start with '%PDF' magic bytes
    const pdfMagicBytes = response.body.slice(0, 4).toString("utf-8");
    expect(pdfMagicBytes).toBe("%PDF");
    expect(response.body.length).toBeGreaterThan(1000); // Reasonable PDF document size
  });

  // --------------------------------------------------------------------------
  // TEST 2: RECEPTIONIST CAN ACCESS ANY INVOICE FOR COUNTER PRINTING
  // --------------------------------------------------------------------------
  it("allows front-desk staff to stream any guest's invoice for counter printing", async () => {
    const response = await request(app)
      .get(`/api/v1/bookings/${testBooking._id}/invoice`)
      .set("Authorization", `Bearer ${receptionistToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const data = [];
        res.on("data", (chunk) => data.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(data)));
      });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/pdf");

    const pdfMagicBytes = response.body.slice(0, 4).toString("utf-8");
    expect(pdfMagicBytes).toBe("%PDF");
  });

  // --------------------------------------------------------------------------
  // TEST 3: PRIVACY GUARD - STRANGER ACCESS IS BLOCKED (403)
  // --------------------------------------------------------------------------
  it("denies access to an unauthorized guest attempting to download someone else's invoice (403 Forbidden)", async () => {
    const response = await request(app)
      .get(`/api/v1/bookings/${testBooking._id}/invoice`)
      .set("Authorization", `Bearer ${otherGuestToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("permission");
  });

  // --------------------------------------------------------------------------
  // TEST 4: UNAUTHENTICATED REQUEST IS BLOCKED (401)
  // --------------------------------------------------------------------------
  it("rejects unauthenticated invoice requests with 401 Unauthorized", async () => {
    const response = await request(app).get(
      `/api/v1/bookings/${testBooking._id}/invoice`
    );

    expect(response.status).toBe(401);
  });
});
