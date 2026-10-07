const dbHelper = require("../fixtures/db-helper");
const Room = require("../../src/models/Room");
const Booking = require("../../src/models/Booking");
const User = require("../../src/models/User");
const CronService = require("../../src/services/cron.service");
const { BOOKING_STATUS } = require("../../src/config/constants");

/**
 * ============================================================================
 * CRON SERVICE (15-Minute Unpaid Booking Auto-Release) UNIT TESTS
 * ============================================================================
 *
 * Yeh tests verify karte hain ke background watchdog cron job theek se kaam karta hai:
 * 1. Expired pending bookings (jinke 15 minute guzar chuke hain) ko automatically cancel karna
 *    aur room ke date locks (`reservedRanges`) release karna.
 * 2. Active non-expired bookings (jinke 15 minute abhi baqi hain) ko bilkul na chherna.
 * 3. Confirmed bookings ko touch na karna.
 * 4. Scheduler lifecycle (initScheduledJobs aur stopScheduledJobs) ki integrity.
 */
describe("Cron Service - 15-Minute Unpaid Booking Watchdog Tests", () => {
  let testRoom, testUser;

  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterAll(async () => {
    CronService.stopScheduledJobs();
    await dbHelper.disconnect();
  });

  beforeEach(async () => {
    await dbHelper.clearDatabase();
    await Room.init();
    await Booking.init();
    await User.init();

    // 1. Create a test room
    testRoom = await Room.create({
      roomNumber: "CRON-101",
      type: "deluxe",
      description: "Room for Cron Watchdog Test",
      capacity: 2,
      pricePerNight: 120,
      housekeepingStatus: "clean",
      isActive: true,
      isDeleted: false,
    });

    // 2. Create a test user
    testUser = await User.create({
      name: "Tariq Guest",
      email: "tariq.cron@example.com",
      password: "Password123!",
      role: "user",
      isActive: true,
    });
  });

  afterEach(() => {
    CronService.stopScheduledJobs();
  });

  /**
   * Helper function: Pending booking create karna with room date locks
   */
  async function createPendingBooking({ expiresAt, bookingRef = "BK-CRON-TEST1" }) {
    const checkIn = new Date("2026-11-01T14:00:00.000Z");
    const checkOut = new Date("2026-11-03T11:00:00.000Z");

    const booking = await Booking.create({
      bookingReference: bookingRef,
      userId: testUser._id,
      rooms: [{ roomId: testRoom._id, pricePerNight: 120 }],
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: 2,
      totalPrice: 240,
      status: BOOKING_STATUS.PENDING,
      paymentStatus: "unpaid",
      expiresAt: new Date(expiresAt),
    });

    // Room me date lock lagayein
    await Room.findByIdAndUpdate(testRoom._id, {
      $push: {
        reservedRanges: {
          checkInDate: checkIn,
          checkOutDate: checkOut,
          bookingReference: bookingRef,
        },
      },
    });

    return booking;
  }

  // --------------------------------------------------------------------------
  // TEST 1: AUTO-RELEASE EXPIRED BOOKINGS
  // --------------------------------------------------------------------------
  it("automatically cancels an unpaid pending booking whose 15-minute timer has expired and unlocks the room", async () => {
    // 20 minute pehle expired booking
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
    const booking = await createPendingBooking({
      expiresAt: twentyMinutesAgo,
      bookingRef: "BK-EXPIRED-01",
    });

    // Verify room has date lock before cron runs
    let room = await Room.findById(testRoom._id);
    expect(room.reservedRanges.length).toBe(1);

    // Run cron release worker
    const result = await CronService.releaseExpiredBookings();

    expect(result.releasedCount).toBe(1);
    expect(result.bookingReferences).toContain("BK-EXPIRED-01");

    // 1. Verify Booking DB status
    const dbBooking = await Booking.findById(booking._id);
    expect(dbBooking.status).toBe(BOOKING_STATUS.CANCELLED);
    expect(dbBooking.cancellation.reason).toContain("5-minute checkout timer expired");
    expect(dbBooking.cancellation.appliedTier).toBe("no-advance-payment");
    expect(dbBooking.cancellation.refundAmount).toBe(0);

    // 2. Verify Room DB lock has been removed ($pull)
    room = await Room.findById(testRoom._id);
    expect(room.reservedRanges.length).toBe(0);
  });

  // --------------------------------------------------------------------------
  // TEST 2: ACTIVE (NON-EXPIRED) BOOKINGS ARE NOT TOUCHED
  // --------------------------------------------------------------------------
  it("does NOT cancel an active pending booking that still has time remaining", async () => {
    // 10 minute aage ka expiry time (abhi 10 minute baqi hain)
    const tenMinutesInFuture = new Date(Date.now() + 10 * 60 * 1000);
    const booking = await createPendingBooking({
      expiresAt: tenMinutesInFuture,
      bookingRef: "BK-ACTIVE-01",
    });

    // Run cron release worker
    const result = await CronService.releaseExpiredBookings();

    expect(result.releasedCount).toBe(0);
    expect(result.bookingReferences).toHaveLength(0);

    // Verify Booking is still pending
    const dbBooking = await Booking.findById(booking._id);
    expect(dbBooking.status).toBe(BOOKING_STATUS.PENDING);

    // Verify Room lock remains intact
    const room = await Room.findById(testRoom._id);
    expect(room.reservedRanges.length).toBe(1);
  });

  // --------------------------------------------------------------------------
  // TEST 3: CONFIRMED BOOKINGS ARE NEVER CANCELLED BY EXPIRY CRON
  // --------------------------------------------------------------------------
  it("never cancels a confirmed booking even if expiresAt date is in the past", async () => {
    const checkIn = new Date("2026-11-01T14:00:00.000Z");
    const checkOut = new Date("2026-11-03T11:00:00.000Z");

    const confirmedBooking = await Booking.create({
      bookingReference: "BK-CONFIRMED-01",
      userId: testUser._id,
      rooms: [{ roomId: testRoom._id, pricePerNight: 120 }],
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: 2,
      totalPrice: 240,
      status: BOOKING_STATUS.CONFIRMED,
      paymentStatus: "completed",
      expiresAt: new Date(Date.now() - 30 * 60 * 1000), // Purani expiry
    });

    const result = await CronService.releaseExpiredBookings();
    expect(result.releasedCount).toBe(0);

    const dbBooking = await Booking.findById(confirmedBooking._id);
    expect(dbBooking.status).toBe(BOOKING_STATUS.CONFIRMED);
  });

  // --------------------------------------------------------------------------
  // TEST 4: BATCH RELEASE OF MULTIPLE EXPIRED RESERVATIONS
  // --------------------------------------------------------------------------
  it("correctly batch-processes and unlocks multiple expired bookings at once", async () => {
    const expiredTime = new Date(Date.now() - 16 * 60 * 1000);

    await createPendingBooking({ expiresAt: expiredTime, bookingRef: "BK-MULTI-1" });
    await createPendingBooking({ expiresAt: expiredTime, bookingRef: "BK-MULTI-2" });

    const result = await CronService.releaseExpiredBookings();
    expect(result.releasedCount).toBe(2);
    expect(result.bookingReferences).toContain("BK-MULTI-1");
    expect(result.bookingReferences).toContain("BK-MULTI-2");

    const room = await Room.findById(testRoom._id);
    expect(room.reservedRanges.length).toBe(0);
  });

  // --------------------------------------------------------------------------
  // TEST 5: SCHEDULER LIFECYCLE (START / STOP)
  // --------------------------------------------------------------------------
  it("initializes and safely stops scheduled cron jobs without errors", () => {
    expect(CronService.activeJobs.length).toBe(0);

    CronService.initScheduledJobs();
    expect(CronService.activeJobs.length).toBeGreaterThan(0);

    CronService.stopScheduledJobs();
    expect(CronService.activeJobs.length).toBe(0);
  });
});
