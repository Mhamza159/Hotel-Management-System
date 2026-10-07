const request = require('supertest');
const app = require('../../src/app');
const dbHelper = require('../fixtures/db-helper');
const Room = require('../../src/models/Room');
const Booking = require('../../src/models/Booking');
const User = require('../../src/models/User');
const { generateAccessToken } = require('../../src/middlewares/auth.middleware');

describe('Booking API Endpoints Integration Tests', () => {
  let roomA, roomB;
  let guestUser, guestToken;
  let otherUser, otherToken;

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

    // Create test rooms
    roomA = await Room.create({
      roomNumber: 'A-101',
      type: 'single',
      description: 'Single Cozy Room',
      capacity: 1,
      pricePerNight: 80,
      housekeepingStatus: 'clean',
    });

    roomB = await Room.create({
      roomNumber: 'B-201',
      type: 'deluxe',
      description: 'Deluxe Ocean View',
      capacity: 2,
      pricePerNight: 160,
      housekeepingStatus: 'clean',
    });

    // Create users
    guestUser = await User.create({
      name: 'Primary Guest',
      email: 'primary@hotel.com',
      password: 'Password123!',
      role: 'user',
    });

    otherUser = await User.create({
      name: 'Other Guest',
      email: 'other@hotel.com',
      password: 'Password123!',
      role: 'user',
    });

    guestToken = generateAccessToken(guestUser._id);
    otherToken = generateAccessToken(otherUser._id);
  });

  describe('GET /api/v1/rooms/available', () => {
    it('returns available rooms for valid date query', async () => {
      const res = await request(app)
        .get('/api/v1/rooms/available')
        .query({
          checkInDate: '2026-11-01',
          checkOutDate: '2026-11-04',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('rejects query missing dates with 400', async () => {
      const res = await request(app).get('/api/v1/rooms/available');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/bookings', () => {
    it('creates an atomic reservation with authoritative pricing for multiple rooms', async () => {
      // 3 nights * (80 + 160) = 3 * 240 = 720
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          roomIds: [roomA._id.toString(), roomB._id.toString()],
          checkInDate: '2026-11-10',
          checkOutDate: '2026-11-13',
          numberOfGuests: 3,
          specialRequests: 'High floor preferred',
          paymentMethod: 'pay_at_desk',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bookingReference).toMatch(/^BK-/);
      expect(res.body.data.totalPrice).toBe(720);
      expect(res.body.data.status).toBe('confirmed');
      expect(res.body.data.paymentStatus).toBe('unpaid');
      expect(res.body.data.rooms.length).toBe(2);
    });

    it('sets status=pending and expiresAt for online payment checkout', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          roomIds: [roomA._id.toString()],
          checkInDate: '2026-11-20',
          checkOutDate: '2026-11-22',
          numberOfGuests: 1,
          paymentMethod: 'online',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.expiresAt).toBeDefined();
    });

    it('rejects when guest count exceeds total capacity of selected rooms', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          roomIds: [roomA._id.toString()], // Capacity is 1
          checkInDate: '2026-11-10',
          checkOutDate: '2026-11-12',
          numberOfGuests: 5,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/capacity/i);
    });

    it('rejects booking when authentication header is missing', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .send({
          roomIds: [roomA._id.toString()],
          checkInDate: '2026-11-10',
          checkOutDate: '2026-11-12',
          numberOfGuests: 1,
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/bookings/my', () => {
    it('returns only the authenticated user bookings', async () => {
      // Create a booking for guestUser
      await Booking.create({
        bookingReference: Booking.generateBookingReference(),
        userId: guestUser._id,
        rooms: [{ roomId: roomA._id, pricePerNight: 80 }],
        checkInDate: new Date('2026-12-01'),
        checkOutDate: new Date('2026-12-03'),
        numberOfGuests: 1,
        totalPrice: 160,
      });

      // Create a booking for otherUser
      await Booking.create({
        bookingReference: Booking.generateBookingReference(),
        userId: otherUser._id,
        rooms: [{ roomId: roomB._id, pricePerNight: 160 }],
        checkInDate: new Date('2026-12-05'),
        checkOutDate: new Date('2026-12-08'),
        numberOfGuests: 2,
        totalPrice: 480,
      });

      const res = await request(app)
        .get('/api/v1/bookings/my')
        .set('Authorization', `Bearer ${guestToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bookings.length).toBe(1);
      expect(res.body.data.bookings[0].userId.toString()).toBe(guestUser._id.toString());
    });
  });

  describe('GET /api/v1/bookings/:id', () => {
    it('returns booking details to the owner', async () => {
      const booking = await Booking.create({
        bookingReference: Booking.generateBookingReference(),
        userId: guestUser._id,
        rooms: [{ roomId: roomA._id, pricePerNight: 80 }],
        checkInDate: new Date('2026-12-01'),
        checkOutDate: new Date('2026-12-03'),
        numberOfGuests: 1,
        totalPrice: 160,
      });

      const res = await request(app)
        .get(`/api/v1/bookings/${booking._id}`)
        .set('Authorization', `Bearer ${guestToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id.toString()).toBe(booking._id.toString());
    });

    it('denies access to another guest with 403 Forbidden', async () => {
      const booking = await Booking.create({
        bookingReference: Booking.generateBookingReference(),
        userId: guestUser._id,
        rooms: [{ roomId: roomA._id, pricePerNight: 80 }],
        checkInDate: new Date('2026-12-01'),
        checkOutDate: new Date('2026-12-03'),
        numberOfGuests: 1,
        totalPrice: 160,
      });

      const res = await request(app)
        .get(`/api/v1/bookings/${booking._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
    });
  });
});
