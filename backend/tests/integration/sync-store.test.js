// Settle window band, taake abhi likhe documents foran collect hon
const previousSettle = process.env.SYNC_SETTLE_MS;
process.env.SYNC_SETTLE_MS = '0';

const mongoose = require('mongoose');
const dbHelper = require('../fixtures/db-helper');
const Room = require('../../src/models/Room');
const User = require('../../src/models/User');
const Booking = require('../../src/models/Booking');
const Review = require('../../src/models/Review');
const AuditLog = require('../../src/models/AuditLog');
const SyncTombstone = require('../../src/models/SyncTombstone');
const { collectChanges, applyChanges, TOMBSTONES } = require('../../src/sync/syncStore');
const { encode, decode } = require('../../src/sync/wire');

const daysFromNow = (n) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

const makeRoom = (number) =>
  Room.create({
    roomNumber: number,
    type: 'deluxe',
    description: 'Sync test room',
    capacity: 2,
    pricePerNight: 100,
  });

const makeUser = (email, role = 'user') =>
  User.create({ name: 'Sync User', email, password: 'Password123!', role });

// Doosre node se aaya hua raw booking document
const remoteBooking = ({ room, user, checkIn, checkOut, origin = 'hub', at = new Date(), ...rest }) => ({
  _id: new mongoose.Types.ObjectId(),
  bookingReference: `BK-SYNC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  userId: user._id,
  rooms: [{ roomId: room._id, pricePerNight: 100 }],
  checkInDate: checkIn,
  checkOutDate: checkOut,
  numberOfGuests: 1,
  totalPrice: 100,
  status: 'confirmed',
  paymentStatus: 'unpaid',
  syncConflict: null,
  syncUpdatedAt: at,
  syncOrigin: origin,
  ...rest,
});

describe('Sync plugin and store', () => {
  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterAll(async () => {
    await dbHelper.disconnect();
    if (previousSettle === undefined) delete process.env.SYNC_SETTLE_MS;
    else process.env.SYNC_SETTLE_MS = previousSettle;
  });

  beforeEach(async () => {
    await dbHelper.clearDatabase();
  });

  describe('plugin stamps', () => {
    it('stamps create, update and updateMany with time and origin', async () => {
      const room = await makeRoom('S-101');
      expect(room.syncUpdatedAt).toBeInstanceOf(Date);
      expect(room.syncOrigin).toBe('cloud');

      const before = room.syncUpdatedAt;
      await new Promise((r) => setTimeout(r, 5));
      await Room.updateOne({ _id: room._id }, { description: 'Plain field update' });
      const afterPlain = await Room.findById(room._id).lean();
      expect(afterPlain.description).toBe('Plain field update');
      expect(afterPlain.syncUpdatedAt.getTime()).toBeGreaterThan(before.getTime());

      await new Promise((r) => setTimeout(r, 5));
      await Room.updateMany({}, { $set: { housekeepingStatus: 'dirty' } });
      const afterMany = await Room.findById(room._id).lean();
      expect(afterMany.syncUpdatedAt.getTime()).toBeGreaterThan(afterPlain.syncUpdatedAt.getTime());
    });

    it('does not restamp a room when only reservedRanges change', async () => {
      const room = await makeRoom('S-102');
      const stamped = room.syncUpdatedAt.getTime();
      await new Promise((r) => setTimeout(r, 5));
      await Room.findOneAndUpdate(
        { _id: room._id },
        { $push: { reservedRanges: { checkIn: daysFromNow(5), checkOut: daysFromNow(6), bookingReference: 'BK-X' } } }
      );
      const fresh = await Room.findById(room._id).lean();
      expect(fresh.reservedRanges).toHaveLength(1);
      expect(fresh.syncUpdatedAt.getTime()).toBe(stamped);
    });

    it('stamps append-only audit logs', async () => {
      const user = await makeUser('audit@example.com');
      const log = await AuditLog.create({
        actorId: user._id,
        action: 'test:action',
        targetType: 'User',
        targetId: user._id,
      });
      expect(log.syncOrigin).toBe('cloud');
    });

    it('writes tombstones for query, findOneAndDelete and document deletes', async () => {
      const a = await makeUser('a@example.com');
      const b = await makeUser('b@example.com');
      const c = await makeUser('c@example.com');
      await User.deleteMany({ _id: { $in: [a._id, b._id] } });
      await c.deleteOne();
      expect(await SyncTombstone.countDocuments({ collectionName: 'users' })).toBe(3);

      const room = await makeRoom('S-103');
      const review = await Review.create({
        guestId: c._id,
        roomId: room._id,
        bookingId: new mongoose.Types.ObjectId(),
        rating: 5,
        comment: 'Lovely stay, very clean',
      });
      await Review.findOneAndDelete({ _id: review._id });
      const tomb = await SyncTombstone.findOne({ collectionName: 'reviews' }).lean();
      expect(String(tomb.docId)).toBe(String(review._id));
      expect(tomb.syncOrigin).toBe('cloud');
    });
  });

  describe('collect', () => {
    it('pages by (syncUpdatedAt, _id) cursor and only returns the requested origin', async () => {
      for (let i = 0; i < 5; i += 1) await makeRoom(`P-${i}`);

      const first = await collectChanges({ origin: 'cloud', limit: 3 });
      expect(first.changes.rooms).toHaveLength(3);
      expect(first.hasMore).toBe(true);

      const second = await collectChanges({ origin: 'cloud', cursors: first.cursors, limit: 3 });
      expect(second.changes.rooms).toHaveLength(2);
      const ids = [...first.changes.rooms, ...second.changes.rooms].map((r) => String(r._id));
      expect(new Set(ids).size).toBe(5);

      const third = await collectChanges({ origin: 'cloud', cursors: second.cursors, limit: 3 });
      expect(third.count).toBe(0);

      expect((await collectChanges({ origin: 'hub' })).count).toBe(0);
    });

    it('survives the EJSON wire format (ObjectId and Date types)', async () => {
      await makeRoom('W-1');
      const batch = await collectChanges({ origin: 'cloud' });
      const roundTrip = decode(JSON.parse(JSON.stringify(encode(batch))));
      const room = roundTrip.changes.rooms[0];
      expect(room._id).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(room.syncUpdatedAt).toBeInstanceOf(Date);
      expect(roundTrip.cursors.rooms.ts).toBeInstanceOf(Date);
    });
  });

  describe('backfill', () => {
    it('stamps pre-sync documents once so they get collected', async () => {
      const { backfillLegacyDocuments } = require('../../src/sync/syncStore');
      const legacyId = new mongoose.Types.ObjectId();
      await Room.collection.insertOne({
        _id: legacyId,
        roomNumber: 'OLD-1',
        type: 'deluxe',
        description: 'Created before sync existed',
        capacity: 2,
        pricePerNight: 90,
        isActive: true,
        isDeleted: false,
        reservedRanges: [],
      });
      expect((await collectChanges({ origin: 'cloud' })).count).toBe(0);

      const first = await backfillLegacyDocuments();
      expect(first.rooms).toBe(1);
      const batch = await collectChanges({ origin: 'cloud' });
      expect(batch.changes.rooms.map((r) => String(r._id))).toEqual([String(legacyId)]);

      const second = await backfillLegacyDocuments();
      expect(second.rooms).toBe(0);
    });
  });

  describe('apply', () => {
    it('applies newer remote documents and skips older ones (last writer wins)', async () => {
      const room = await makeRoom('L-1');
      const local = await Room.findById(room._id).lean();

      const older = { ...local, description: 'older remote', syncUpdatedAt: new Date(local.syncUpdatedAt.getTime() - 1000), syncOrigin: 'hub' };
      let result = await applyChanges({ rooms: [older] });
      expect(result.skipped).toBe(1);
      expect((await Room.findById(room._id).lean()).description).toBe('Sync test room');

      const newer = { ...local, description: 'newer remote', syncUpdatedAt: new Date(Date.now() + 1000), syncOrigin: 'hub' };
      result = await applyChanges({ rooms: [newer] });
      expect(result.applied).toBe(1);
      const fresh = await Room.findById(room._id).lean();
      expect(fresh.description).toBe('newer remote');
      // Remote ki muhar wesi rehti hai (wapis nahi bheja jayega)
      expect(fresh.syncOrigin).toBe('hub');
    });

    it('keeps local room locks when a remote room update arrives', async () => {
      const room = await makeRoom('L-2');
      await Room.updateOne(
        { _id: room._id },
        { $push: { reservedRanges: { checkIn: daysFromNow(3), checkOut: daysFromNow(4), bookingReference: 'BK-LOCAL' } } }
      );
      const remote = {
        ...(await Room.findById(room._id).lean()),
        reservedRanges: [],
        pricePerNight: 180,
        syncUpdatedAt: new Date(Date.now() + 1000),
        syncOrigin: 'hub',
      };
      await applyChanges({ rooms: [remote] });
      const fresh = await Room.findById(room._id).lean();
      expect(fresh.pricePerNight).toBe(180);
      expect(fresh.reservedRanges.map((r) => r.bookingReference)).toEqual(['BK-LOCAL']);
    });

    it('locks rooms for a synced booking and releases them when it is cancelled', async () => {
      const room = await makeRoom('B-1');
      const user = await makeUser('guest1@example.com');
      const booking = remoteBooking({ room, user, checkIn: daysFromNow(10), checkOut: daysFromNow(12) });

      await applyChanges({ bookings: [booking] });
      let fresh = await Room.findById(room._id).lean();
      expect(fresh.reservedRanges).toHaveLength(1);
      expect(fresh.reservedRanges[0].bookingReference).toBe(booking.bookingReference);

      const cancelled = { ...booking, status: 'cancelled', syncUpdatedAt: new Date(Date.now() + 1000) };
      await applyChanges({ bookings: [cancelled] });
      fresh = await Room.findById(room._id).lean();
      expect(fresh.reservedRanges).toHaveLength(0);
    });

    it('applies a booking that arrives before its room once the room syncs', async () => {
      const user = await makeUser('guest2@example.com');
      const roomDoc = {
        _id: new mongoose.Types.ObjectId(),
        roomNumber: 'B-LATE',
        type: 'suite',
        description: 'Arrives after the booking',
        capacity: 2,
        pricePerNight: 200,
        isActive: true,
        isDeleted: false,
        housekeepingStatus: 'clean',
        reservedRanges: [],
        syncUpdatedAt: new Date(),
        syncOrigin: 'hub',
      };
      const booking = remoteBooking({ room: roomDoc, user, checkIn: daysFromNow(20), checkOut: daysFromNow(22) });

      await applyChanges({ bookings: [booking] });
      await applyChanges({ rooms: [roomDoc] });
      const fresh = await Room.findById(roomDoc._id).lean();
      expect(fresh.reservedRanges.map((r) => r.bookingReference)).toEqual([booking.bookingReference]);
    });

    it('records a duplicate-email user as a conflict instead of failing the batch', async () => {
      await makeUser('same@example.com');
      const remoteUser = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Other Same',
        email: 'same@example.com',
        password: 'hash',
        role: 'user',
        syncUpdatedAt: new Date(),
        syncOrigin: 'hub',
      };
      const room = await makeRoom('D-1');
      const result = await applyChanges({ users: [remoteUser], rooms: [] });
      expect(result.conflicts).toEqual([
        expect.objectContaining({ collection: 'users', reason: 'duplicate email', value: 'same@example.com' }),
      ]);
      expect(await User.countDocuments({ email: 'same@example.com' })).toBe(1);
      expect(room).toBeTruthy();
    });

    it('applies remote tombstones and releases a deleted booking lock', async () => {
      const room = await makeRoom('T-1');
      const user = await makeUser('guest3@example.com');
      const booking = remoteBooking({ room, user, checkIn: daysFromNow(30), checkOut: daysFromNow(31) });
      await applyChanges({ bookings: [booking] });

      const tombstone = {
        _id: new mongoose.Types.ObjectId(),
        collectionName: 'bookings',
        docId: booking._id,
        syncUpdatedAt: new Date(Date.now() + 1000),
        syncOrigin: 'hub',
      };
      const result = await applyChanges({ [TOMBSTONES]: [tombstone] });
      expect(result.applied).toBe(1);
      expect(await Booking.countDocuments({ _id: booking._id })).toBe(0);
      expect((await Room.findById(room._id).lean()).reservedRanges).toHaveLength(0);
      // Remote tombstone remote origin ke saath save hota hai (wapis nahi jata)
      expect((await collectChanges({ origin: 'cloud' })).changes[TOMBSTONES]).toBeUndefined();
    });
  });
});
