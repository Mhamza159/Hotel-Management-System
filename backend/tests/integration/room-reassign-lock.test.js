const dbHelper = require('../fixtures/db-helper');
const Room = require('../../src/models/Room');
const Booking = require('../../src/models/Booking');
const User = require('../../src/models/User');
const BookingService = require('../../src/services/booking.service');
const DeskService = require('../../src/services/desk.service');

/**
 * ============================================================================
 * H5 REGRESSION: FRONT DESK ROOM RE-ASSIGNMENT
 * ============================================================================
 *
 * allotRooms / checkInGuest pehle sirf confirmed|checked-in bookings check karte
 * the aur naye room par range bina atomic shart ke push karte the — pending
 * booking wala room de dete the, aur do receptionist ek saath same room de dein
 * to dono kamyab. Ab move atomic hai aur fail hone par sab wapis.
 */
describe('Front desk room re-assignment locks (H5)', () => {
  let guest;

  const daysFromNow = (n) => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const makeRoom = (roomNumber) =>
    Room.create({ roomNumber, type: 'deluxe', description: 'H5 room', capacity: 2, pricePerNight: 100, housekeepingStatus: 'clean' });

  const book = (rooms, paymentMethod = 'pay_at_desk', from = 10, to = 12) =>
    BookingService.createBooking({
      userId: guest._id,
      roomIds: rooms.map((r) => String(r._id)),
      checkInDate: daysFromNow(from),
      checkOutDate: daysFromNow(to),
      numberOfGuests: 1,
      paymentMethod,
    });

  const refsOn = async (room) =>
    ((await Room.findById(room._id).lean()).reservedRanges || []).map((r) => r.bookingReference);

  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterAll(async () => {
    await dbHelper.disconnect();
  });

  beforeEach(async () => {
    await dbHelper.clearDatabase();
    await Promise.all([Room.init(), Booking.init(), User.init()]);
    guest = await User.create({ name: 'H5 Guest', email: 'h5.guest@example.com', password: 'Password123!' });
  });

  it('refuses to allot a room held by a pending online booking for the same dates', async () => {
    const [roomA, roomB] = await Promise.all([makeRoom('A-1'), makeRoom('B-1')]);
    const pending = await book([roomB], 'online'); // pending, holds B
    const desk = await book([roomA]);

    await expect(
      DeskService.allotRooms(String(desk._id), [{ slotIndex: 0, allocatedRoomId: String(roomB._id) }])
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(await refsOn(roomA)).toEqual([desk.bookingReference]);
    expect(await refsOn(roomB)).toEqual([pending.bookingReference]);
  });

  it('lets only one of two simultaneous allotments take the same free room', async () => {
    const [roomA, roomB, roomC] = await Promise.all([makeRoom('A-2'), makeRoom('B-2'), makeRoom('C-2')]);
    const first = await book([roomA]);
    const second = await book([roomB]);

    const results = await Promise.allSettled([
      DeskService.allotRooms(String(first._id), [{ slotIndex: 0, allocatedRoomId: String(roomC._id) }]),
      DeskService.allotRooms(String(second._id), [{ slotIndex: 0, allocatedRoomId: String(roomC._id) }]),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')[0].reason.statusCode).toBe(409);
    expect(await refsOn(roomC)).toHaveLength(1);

    // Haarne wali booking apne purane room par hi rehti hai, lock samet
    const loser = results[0].status === 'rejected' ? first : second;
    const loserRoom = loser === first ? roomA : roomB;
    expect(await refsOn(loserRoom)).toEqual([loser.bookingReference]);
    const loserFresh = await Booking.findById(loser._id).lean();
    expect(String(loserFresh.rooms[0].roomId)).toBe(String(loserRoom._id));
  });

  it('rolls back earlier slots when a later slot of a multi-room booking cannot be allotted', async () => {
    const [roomA, roomB, roomFree, roomTaken] = await Promise.all([
      makeRoom('A-3'),
      makeRoom('B-3'),
      makeRoom('FREE-3'),
      makeRoom('TAKEN-3'),
    ]);
    const other = await book([roomTaken]);
    const family = await book([roomA, roomB]);

    await expect(
      DeskService.allotRooms(String(family._id), [
        { slotIndex: 0, allocatedRoomId: String(roomFree._id) },
        { slotIndex: 1, allocatedRoomId: String(roomTaken._id) },
      ])
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(await refsOn(roomFree)).toEqual([]);
    expect(await refsOn(roomA)).toEqual([family.bookingReference]);
    expect(await refsOn(roomB)).toEqual([family.bookingReference]);
    expect(await refsOn(roomTaken)).toEqual([other.bookingReference]);
  });

  it('still moves a booking to a free room and frees the old one', async () => {
    const [roomA, roomB] = await Promise.all([makeRoom('A-4'), makeRoom('B-4')]);
    const desk = await book([roomA]);

    await DeskService.allotRooms(String(desk._id), [{ slotIndex: 0, allocatedRoomId: String(roomB._id) }]);

    expect(await refsOn(roomA)).toEqual([]);
    expect(await refsOn(roomB)).toEqual([desk.bookingReference]);
  });

  it('check-in with a different room also takes the lock atomically', async () => {
    const [roomA, roomB] = await Promise.all([makeRoom('A-5'), makeRoom('B-5')]);
    const today = await book([roomA], 'pay_at_desk', 0, 2);
    const pendingOnB = await book([roomB], 'online', 0, 2);

    await expect(DeskService.checkInGuest(String(today._id), String(roomB._id))).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(await refsOn(roomB)).toEqual([pendingOnB.bookingReference]);
    expect(await refsOn(roomA)).toEqual([today.bookingReference]);
  });
});
