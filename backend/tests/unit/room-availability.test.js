const mongoose = require('mongoose');
const dbHelper = require('../fixtures/db-helper');
const Room = require('../../src/models/Room');
const Booking = require('../../src/models/Booking');
const RoomService = require('../../src/services/room.service');
const { BOOKING_STATUS } = require('../../src/config/constants');

describe('Room Availability Search Service Unit Verification', () => {
  let room1, room2, room3;

  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterAll(async () => {
    await dbHelper.disconnect();
  });

  beforeEach(async () => {
    await dbHelper.clearDatabase();

    // Create test rooms
    room1 = await Room.create({
      roomNumber: '101',
      type: 'deluxe',
      description: 'Deluxe Room',
      capacity: 2,
      pricePerNight: 100,
      housekeepingStatus: 'clean',
    });

    room2 = await Room.create({
      roomNumber: '102',
      type: 'suite',
      description: 'Executive Suite',
      capacity: 4,
      pricePerNight: 250,
      housekeepingStatus: 'clean',
    });

    room3 = await Room.create({
      roomNumber: '103',
      type: 'deluxe',
      description: 'Deluxe Room 2',
      capacity: 2,
      pricePerNight: 120,
      housekeepingStatus: 'clean',
    });
  });

  it('returns all rooms when no bookings exist', async () => {
    const available = await RoomService.findAvailableRooms({
      checkInDate: '2026-11-01',
      checkOutDate: '2026-11-05',
    });

    expect(available.length).toBe(3);
  });

  it('excludes rooms that have overlapping active bookings', async () => {
    // Book room1 from 2026-11-02 to 2026-11-06
    await Booking.create({
      bookingReference: Booking.generateBookingReference(),
      userId: new mongoose.Types.ObjectId(),
      rooms: [{ roomId: room1._id, pricePerNight: 100 }],
      checkInDate: new Date('2026-11-02'),
      checkOutDate: new Date('2026-11-06'),
      numberOfGuests: 2,
      totalPrice: 400,
      status: BOOKING_STATUS.CONFIRMED,
    });

    // Query for 2026-11-03 to 2026-11-05 (overlapping with room1)
    const available = await RoomService.findAvailableRooms({
      checkInDate: '2026-11-03',
      checkOutDate: '2026-11-05',
    });

    expect(available.length).toBe(2);
    const availableIds = available.map((r) => r._id.toString());
    expect(availableIds).not.toContain(room1._id.toString());
    expect(availableIds).toContain(room2._id.toString());
    expect(availableIds).toContain(room3._id.toString());
  });

  it('allows adjacent bookings where checkOut equals next checkIn', async () => {
    // Room1 booked until 2026-11-05
    await Booking.create({
      bookingReference: Booking.generateBookingReference(),
      userId: new mongoose.Types.ObjectId(),
      rooms: [{ roomId: room1._id, pricePerNight: 100 }],
      checkInDate: new Date('2026-11-01'),
      checkOutDate: new Date('2026-11-05'),
      numberOfGuests: 2,
      totalPrice: 400,
      status: BOOKING_STATUS.CONFIRMED,
    });

    // New search starts on 2026-11-05 (the exact checkout day)
    const available = await RoomService.findAvailableRooms({
      checkInDate: '2026-11-05',
      checkOutDate: '2026-11-08',
    });

    const availableIds = available.map((r) => r._id.toString());
    expect(availableIds).toContain(room1._id.toString());
  });

  it('ignores cancelled bookings when calculating availability', async () => {
    // Room1 has a cancelled booking
    await Booking.create({
      bookingReference: Booking.generateBookingReference(),
      userId: new mongoose.Types.ObjectId(),
      rooms: [{ roomId: room1._id, pricePerNight: 100 }],
      checkInDate: new Date('2026-11-01'),
      checkOutDate: new Date('2026-11-05'),
      numberOfGuests: 2,
      totalPrice: 400,
      status: BOOKING_STATUS.CANCELLED,
    });

    const available = await RoomService.findAvailableRooms({
      checkInDate: '2026-11-02',
      checkOutDate: '2026-11-04',
    });

    const availableIds = available.map((r) => r._id.toString());
    expect(availableIds).toContain(room1._id.toString());
  });

  it('filters by room type and capacity correctly', async () => {
    const suites = await RoomService.findAvailableRooms({
      checkInDate: '2026-11-01',
      checkOutDate: '2026-11-05',
      type: 'suite',
    });

    expect(suites.length).toBe(1);
    expect(suites[0]._id.toString()).toBe(room2._id.toString());

    const largeRooms = await RoomService.findAvailableRooms({
      checkInDate: '2026-11-01',
      checkOutDate: '2026-11-05',
      minCapacity: 3,
    });

    expect(largeRooms.length).toBe(1);
    expect(largeRooms[0]._id.toString()).toBe(room2._id.toString());
  });

  it('throws ApiError.badRequest for inverted date ranges', async () => {
    await expect(
      RoomService.findAvailableRooms({
        checkInDate: '2026-11-10',
        checkOutDate: '2026-11-05',
      })
    ).rejects.toThrow(/checkOutDate must be strictly after checkInDate/);
  });
});
