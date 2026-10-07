const mongoose = require('mongoose');
const dbHelper = require('../fixtures/db-helper');
const Booking = require('../../src/models/Booking');
const { BOOKING_STATUS } = require('../../src/config/constants');

describe('Booking Model Unit Verification', () => {
  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterAll(async () => {
    await dbHelper.disconnect();
  });

  beforeEach(async () => {
    await dbHelper.clearDatabase();
    await Booking.init();
  });

  it('creates and saves a valid booking document with reference', async () => {
    const mockUserId = new mongoose.Types.ObjectId();
    const mockRoomId = new mongoose.Types.ObjectId();

    const booking = await Booking.create({
      bookingReference: Booking.generateBookingReference(),
      userId: mockUserId,
      rooms: [
        {
          roomId: mockRoomId,
          pricePerNight: 120,
        },
      ],
      checkInDate: new Date('2026-10-01'),
      checkOutDate: new Date('2026-10-05'),
      numberOfGuests: 2,
      totalPrice: 480,
    });

    expect(booking._id).toBeDefined();
    expect(booking.bookingReference).toMatch(/^BK-/);
    expect(booking.status).toBe(BOOKING_STATUS.PENDING);
    expect(booking.paymentStatus).toBe('unpaid');
    expect(booking.rooms.length).toBe(1);
    expect(booking.rooms[0].roomId.toString()).toBe(mockRoomId.toString());
    expect(booking.rooms[0].pricePerNight).toBe(120);
  });

  it('rejects booking with empty rooms array', async () => {
    const mockUserId = new mongoose.Types.ObjectId();

    const booking = new Booking({
      bookingReference: Booking.generateBookingReference(),
      userId: mockUserId,
      rooms: [],
      checkInDate: new Date('2026-10-01'),
      checkOutDate: new Date('2026-10-05'),
      numberOfGuests: 1,
      totalPrice: 100,
    });

    await expect(booking.validate()).rejects.toThrow(/at least one room/);
  });

  it('enforces unique bookingReference constraint', async () => {
    const ref = 'BK-TEST-DUP-REF';
    const mockUserId = new mongoose.Types.ObjectId();
    const mockRoomId = new mongoose.Types.ObjectId();

    await Booking.create({
      bookingReference: ref,
      userId: mockUserId,
      rooms: [{ roomId: mockRoomId, pricePerNight: 100 }],
      checkInDate: new Date('2026-10-01'),
      checkOutDate: new Date('2026-10-03'),
      numberOfGuests: 1,
      totalPrice: 200,
    });

    await expect(
      Booking.create({
        bookingReference: ref,
        userId: mockUserId,
        rooms: [{ roomId: mockRoomId, pricePerNight: 100 }],
        checkInDate: new Date('2026-10-10'),
        checkOutDate: new Date('2026-10-12'),
        numberOfGuests: 1,
        totalPrice: 200,
      })
    ).rejects.toThrow();
  });
});
