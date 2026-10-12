const dbHelper = require('../fixtures/db-helper');
const Room = require('../../src/models/Room');
const Booking = require('../../src/models/Booking');
const User = require('../../src/models/User');
const Coupon = require('../../src/models/Coupon');
const BookingService = require('../../src/services/booking.service');
const CancellationService = require('../../src/services/cancellation.service');
const CronService = require('../../src/services/cron.service');

/**
 * ============================================================================
 * H6 REGRESSION: COUPON USAGE + LOYALTY POINTS WAPIS
 * ============================================================================
 * - Booking beech me fail ho (bina transaction) to coupon/points wapis
 * - Expire (cron) ya staff-approved cancellation par ek hi dafa wapis
 */
describe('Coupon and loyalty point release (H6)', () => {
  let room;
  let guest;
  let staff;
  let coupon;

  const daysFromNow = (n) => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const bookWithDiscounts = (overrides = {}) =>
    BookingService.createBooking({
      userId: guest._id,
      roomIds: [String(room._id)],
      checkInDate: daysFromNow(20),
      checkOutDate: daysFromNow(22),
      numberOfGuests: 1,
      paymentMethod: 'online',
      couponCode: 'SAVE10',
      redeemLoyaltyPoints: true,
      ...overrides,
    });

  const balances = async () => ({
    usedCount: (await Coupon.findById(coupon._id).lean()).usedCount,
    points: (await User.findById(guest._id).lean()).loyaltyPoints,
  });

  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterAll(async () => {
    await dbHelper.disconnect();
  });

  beforeEach(async () => {
    await dbHelper.clearDatabase();
    await Promise.all([Room.init(), Booking.init(), User.init(), Coupon.init()]);
    room = await Room.create({ roomNumber: 'D-1', type: 'deluxe', description: 'H6', capacity: 2, pricePerNight: 200 });
    guest = await User.create({ name: 'Points Guest', email: 'points@example.com', password: 'Password123!', loyaltyPoints: 500 });
    staff = await User.create({ name: 'Desk', email: 'desk.h6@example.com', password: 'Password123!', role: 'receptionist' });
    coupon = await Coupon.create({
      code: 'SAVE10',
      discountType: 'percentage',
      discountValue: 10,
      validUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    });
  });

  it('undoes coupon usage and point deduction when the booking write fails midway', async () => {
    // Pehli booking ka idempotencyKey dobara de kar Booking.create ko (coupon/points ke baad) fail karao
    const first = await bookWithDiscounts({ idempotencyKey: 'dup-key-h6' });
    expect(first.loyaltyPointsUsed).toBeGreaterThan(0);
    const before = await balances();

    await expect(
      bookWithDiscounts({ checkInDate: daysFromNow(30), checkOutDate: daysFromNow(31), idempotencyKey: 'dup-key-h6' })
    ).rejects.toBeTruthy();

    expect(await balances()).toEqual(before);
    // Fail hui booking ka room lock bhi nahi bacha
    const fresh = await Room.findById(room._id).lean();
    expect(fresh.reservedRanges.map((r) => r.bookingReference)).toEqual([first.bookingReference]);
  });

  it('gives back coupon usage and points exactly once when an unpaid booking expires', async () => {
    const booking = await bookWithDiscounts();
    const used = booking.loyaltyPointsUsed;
    expect(await balances()).toEqual({ usedCount: 1, points: 500 - used });

    await CronService.releaseExpiredBookings(new Date(Date.now() + 10 * 60 * 1000));
    expect((await Booking.findById(booking._id).lean()).status).toBe('cancelled');
    expect(await balances()).toEqual({ usedCount: 0, points: 500 });

    // Dobara chalane par dobara wapis nahi hota
    expect(await BookingService.releaseBookingDiscounts(await Booking.findById(booking._id).lean())).toBe(false);
    expect(await balances()).toEqual({ usedCount: 0, points: 500 });
  });

  it('gives back coupon usage and points when staff approve a cancellation', async () => {
    const booking = await bookWithDiscounts({ paymentMethod: 'pay_at_desk' });
    await CancellationService.requestCancellation({
      bookingId: String(booking._id),
      userId: String(guest._id),
      userRole: 'user',
      reason: 'Plans changed',
    });
    await CancellationService.approveCancellation({
      bookingId: String(booking._id),
      staffId: String(staff._id),
      staffRole: 'receptionist',
    });

    expect((await Booking.findById(booking._id).lean()).status).toBe('cancelled');
    expect(await balances()).toEqual({ usedCount: 0, points: 500 });
  });
});
