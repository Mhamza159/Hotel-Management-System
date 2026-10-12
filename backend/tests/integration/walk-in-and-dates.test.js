const crypto = require('crypto');
const request = require('supertest');
const app = require('../../src/app');
const dbHelper = require('../fixtures/db-helper');
const Room = require('../../src/models/Room');
const User = require('../../src/models/User');
const Booking = require('../../src/models/Booking');
const { generateAccessToken } = require('../../src/middlewares/auth.middleware');
const {
  hotelDateString,
  startOfHotelToday,
  dateOnlyDayWindow,
  hotelMidnightInstant,
} = require('../../src/utils/hotelDate');

/**
 * ============================================================================
 * MEDIUM BATCH 3: WALK-IN RULES + HOTEL TIMEZONE
 * ============================================================================
 */
describe('Walk-in rules and hotel dates (medium batch 3)', () => {
  let room;
  let deskToken;

  const hotelDay = (days) =>
    new Date(startOfHotelToday().getTime() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const walkIn = (overrides = {}) =>
    request(app)
      .post('/api/v1/desk/walk-in')
      .set('Authorization', `Bearer ${deskToken}`)
      .send({
        guestName: 'Lobby Guest',
        guestPhone: '+923001112233',
        roomIds: [String(room._id)],
        checkInDate: hotelDay(0),
        checkOutDate: hotelDay(1),
        numberOfGuests: 1,
        paymentMethod: 'cash',
        instantCheckIn: false,
        ...overrides,
      });

  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await dbHelper.disconnect();
  });

  beforeEach(async () => {
    await dbHelper.clearDatabase();
    await Promise.all([Room.init(), Booking.init(), User.init()]);
    room = await Room.create({
      roomNumber: 'W-1',
      type: 'deluxe',
      description: 'Walk-in',
      capacity: 2,
      pricePerNight: 100,
      housekeepingStatus: 'clean',
    });
    const desk = await User.create({ name: 'Desk', email: 'desk.w@example.com', password: 'Password123!', role: 'receptionist' });
    deskToken = generateAccessToken(String(desk._id));
  });

  describe('walk-in', () => {
    it('stores the generated guest password hashed once, so the guest could log in with it', async () => {
      const known = Buffer.alloc(16, 7);
      const realRandomBytes = crypto.randomBytes;
      const spy = jest
        .spyOn(crypto, 'randomBytes')
        .mockImplementation((size, ...rest) => (size === 16 ? known : realRandomBytes(size, ...rest)));

      const res = await walkIn({ guestEmail: 'walkin.guest@example.com' });
      spy.mockRestore();
      expect(res.status).toBe(201);

      const guest = await User.findOne({ email: 'walkin.guest@example.com' }).select('+password');
      expect(await guest.isPasswordMatch(known.toString('hex'))).toBe(true);
    });

    it('rejects more guests than the rooms can hold', async () => {
      const res = await walkIn({ numberOfGuests: 3 });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/fit 2 guest/);
      expect(await Booking.countDocuments()).toBe(0);
    });

    it('rejects past dates and instant check-in for a stay that starts later', async () => {
      const past = await walkIn({ checkInDate: hotelDay(-1), checkOutDate: hotelDay(1) });
      expect(past.status).toBe(400);

      const futureInstant = await walkIn({ checkInDate: hotelDay(2), checkOutDate: hotelDay(3), instantCheckIn: true });
      expect(futureInstant.status).toBe(400);
      expect(futureInstant.body.message).toMatch(/starts today/);

      const todayInstant = await walkIn({ instantCheckIn: true });
      expect(todayInstant.status).toBe(201);
      expect(todayInstant.body.data.status).toBe('checked-in');
    });
  });

  describe('hotel date helpers', () => {
    it('uses the hotel timezone (Asia/Karachi, UTC+5) for "today"', () => {
      // 20:30 UTC = agle din 01:30 Karachi
      const lateUtc = new Date('2026-10-12T20:30:00Z');
      expect(hotelDateString(lateUtc)).toBe('2026-10-13');
      expect(startOfHotelToday(lateUtc).toISOString()).toBe('2026-10-13T00:00:00.000Z');
      expect(hotelMidnightInstant('2026-10-13').toISOString()).toBe('2026-10-12T19:00:00.000Z');
    });

    it('builds date-only day windows on the UTC day of the booking dates', () => {
      expect(dateOnlyDayWindow('2026-10-13')).toEqual({
        start: new Date('2026-10-13T00:00:00.000Z'),
        end: new Date('2026-10-13T23:59:59.999Z'),
      });
    });

    it('lists today\'s arrivals by the hotel date', async () => {
      const guest = await User.create({ name: 'Arr', email: 'arr@example.com', password: 'Password123!' });
      await Booking.create({
        bookingReference: 'BK-ARRIVE-1',
        userId: guest._id,
        rooms: [{ roomId: room._id, pricePerNight: 100 }],
        checkInDate: new Date(`${hotelDay(0)}T00:00:00.000Z`),
        checkOutDate: new Date(`${hotelDay(1)}T00:00:00.000Z`),
        numberOfGuests: 1,
        totalPrice: 100,
        status: 'confirmed',
      });
      const res = await request(app)
        .get('/api/v1/desk/bookings')
        .query({ type: 'arrivals' })
        .set('Authorization', `Bearer ${deskToken}`);
      expect(res.status).toBe(200);
      const list = res.body.data.bookings || res.body.data;
      expect(list.map((b) => b.bookingReference)).toContain('BK-ARRIVE-1');
    });
  });
});
