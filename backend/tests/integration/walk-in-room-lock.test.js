const request = require('supertest');
const app = require('../../src/app');
const dbHelper = require('../fixtures/db-helper');
const Room = require('../../src/models/Room');
const Booking = require('../../src/models/Booking');
const User = require('../../src/models/User');
const Payment = require('../../src/models/Payment');
const { generateAccessToken } = require('../../src/middlewares/auth.middleware');
const { ROLES, BOOKING_STATUS } = require('../../src/config/constants');

/**
 * ============================================================================
 * WALK-IN ROOM DATE LOCK REGRESSION TESTS
 * ============================================================================
 *
 * Walk-in bookings ko bhi online bookings jaisa valid `reservedRanges` lock
 * lagana chahiye: sahi field names (checkIn / checkOut), taake room document
 * baad me save ho sake aur online booking usi room/dates par takra na sake.
 */
describe('Walk-In Room Date Lock', () => {
  let room;
  let receptionistToken;
  let housekeepingToken;
  let guestToken;

  const futureDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const walkIn = (overrides = {}) =>
    request(app)
      .post('/api/v1/desk/walk-in')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        guestName: 'Lobby Guest',
        guestPhone: '+923004445566',
        roomIds: [room._id.toString()],
        checkInDate: futureDate(3),
        checkOutDate: futureDate(5),
        numberOfGuests: 1,
        paymentMethod: 'cash',
        instantCheckIn: false,
        ...overrides,
      });

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

    room = await Room.create({
      roomNumber: 'WL-201',
      type: 'deluxe',
      description: 'Walk-in lock test room',
      capacity: 2,
      pricePerNight: 120,
      housekeepingStatus: 'clean',
    });

    const receptionist = await User.create({
      name: 'Lock Desk Officer',
      email: 'lock.desk@example.com',
      password: 'Password123!',
      role: ROLES.RECEPTIONIST,
    });
    receptionistToken = generateAccessToken(receptionist._id.toString());

    const housekeeper = await User.create({
      name: 'Lock Housekeeper',
      email: 'lock.housekeeper@example.com',
      password: 'Password123!',
      role: ROLES.HOUSEKEEPING,
    });
    housekeepingToken = generateAccessToken(housekeeper._id.toString());

    const guest = await User.create({
      name: 'Online Guest',
      email: 'lock.online.guest@example.com',
      password: 'Password123!',
      role: ROLES.GUEST,
    });
    guestToken = generateAccessToken(guest._id.toString());
  });

  it('stores a valid checkIn/checkOut range for an instant check-in walk-in', async () => {
    const res = await walkIn({ checkInDate: futureDate(0), checkOutDate: futureDate(1), instantCheckIn: true });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe(BOOKING_STATUS.CHECKED_IN);

    const dbRoom = await Room.findById(room._id);
    expect(dbRoom.reservedRanges).toHaveLength(1);
    expect(dbRoom.reservedRanges[0].checkIn).toBeInstanceOf(Date);
    expect(dbRoom.reservedRanges[0].checkOut).toBeInstanceOf(Date);
    expect(dbRoom.reservedRanges[0].bookingReference).toBe(res.body.data.bookingReference);
  });

  it('keeps the room saveable after an instant walk-in (housekeeping update succeeds)', async () => {
    const walkInRes = await walkIn({ checkInDate: futureDate(0), checkOutDate: futureDate(1), instantCheckIn: true });
    expect(walkInRes.status).toBe(201);

    const res = await request(app)
      .patch(`/api/v1/rooms/${room._id}/housekeeping`)
      .set('Authorization', `Bearer ${housekeepingToken}`)
      .send({ housekeepingStatus: 'maintenance' });

    expect(res.status).toBe(200);
    expect(res.body.data.room.housekeepingStatus).toBe('maintenance');
  });

  it('locks the room for a reserved (non instant) walk-in so an online booking gets 409', async () => {
    const walkInRes = await walkIn();
    expect(walkInRes.status).toBe(201);
    expect(walkInRes.body.data.status).toBe(BOOKING_STATUS.CONFIRMED);

    const dbRoom = await Room.findById(room._id);
    expect(dbRoom.reservedRanges).toHaveLength(1);

    const onlineRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        roomIds: [room._id.toString()],
        checkInDate: futureDate(4),
        checkOutDate: futureDate(6),
        numberOfGuests: 1,
        paymentMethod: 'pay_at_desk',
      });

    expect(onlineRes.status).toBe(409);
  });

  it('releases the lock when the walk-in booking is cancelled', async () => {
    const walkInRes = await walkIn();
    expect(walkInRes.status).toBe(201);

    const approveRes = await request(app)
      .patch(`/api/v1/desk/bookings/${walkInRes.body.data._id}/cancel-approve`)
      .set('Authorization', `Bearer ${receptionistToken}`);

    expect(approveRes.status).toBe(200);
    const dbRoom = await Room.findById(room._id);
    expect(dbRoom.reservedRanges).toHaveLength(0);
  });
});
