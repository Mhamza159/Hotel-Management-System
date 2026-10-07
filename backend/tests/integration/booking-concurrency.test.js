const request = require('supertest');
const app = require('../../src/app');
const dbHelper = require('../fixtures/db-helper');
const Room = require('../../src/models/Room');
const Booking = require('../../src/models/Booking');
const User = require('../../src/models/User');
const { generateAccessToken } = require('../../src/middlewares/auth.middleware');

describe('Booking Concurrency & Race-Condition Safety (Zero Double-Booking)', () => {
  let room;
  let guest1Token;
  let guest2Token;

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

    // Create target physical room
    room = await Room.create({
      roomNumber: 'CONC-101',
      type: 'deluxe',
      description: 'Concurrency Test Room',
      capacity: 2,
      pricePerNight: 150,
      housekeepingStatus: 'clean',
    });

    // Create two distinct guest accounts
    const user1 = await User.create({
      name: 'Racer One',
      email: 'racer1@test.com',
      password: 'Password123!',
      role: 'user',
    });

    const user2 = await User.create({
      name: 'Racer Two',
      email: 'racer2@test.com',
      password: 'Password123!',
      role: 'user',
    });

    guest1Token = generateAccessToken(user1._id);
    guest2Token = generateAccessToken(user2._id);
  });

  it('guarantees 100% isolation on concurrent overlapping reservations (1 commits 201, 1 rejected 409)', async () => {
    const checkInDate = '2026-12-01';
    const checkOutDate = '2026-12-05';

    // Execute concurrent booking requests targeting the exact same room
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${guest1Token}`)
        .set('Idempotency-Key', 'concurrent-req-1')
        .send({
          roomIds: [room._id.toString()],
          checkInDate,
          checkOutDate,
          numberOfGuests: 2,
          paymentMethod: 'pay_at_desk',
        }),
      request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${guest2Token}`)
        .set('Idempotency-Key', 'concurrent-req-2')
        .send({
          roomIds: [room._id.toString()],
          checkInDate,
          checkOutDate,
          numberOfGuests: 2,
          paymentMethod: 'pay_at_desk',
        }),
    ]);

    const statusCodes = [res1.status, res2.status].sort();

    // Exactly one must succeed with 201 and exactly one must fail with 409 Conflict
    expect(statusCodes).toEqual([201, 409]);

    // Verify database integrity: only 1 booking was committed
    const totalBookings = await Booking.countDocuments({
      'rooms.roomId': room._id,
    });
    expect(totalBookings).toBe(1);

    const winningResponse = res1.status === 201 ? res1 : res2;
    const losingResponse = res1.status === 409 ? res1 : res2;

    expect(winningResponse.body.success).toBe(true);
    expect(winningResponse.body.data.status).toBe('confirmed');
    expect(losingResponse.body.success).toBe(false);
    expect(losingResponse.body.message).toMatch(/available/i);
  });
});
