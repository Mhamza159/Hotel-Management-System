const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/app');
const Room = require('../../src/models/Room');
const Booking = require('../../src/models/Booking');
const User = require('../../src/models/User');
const { generateAccessToken } = require('../../src/middlewares/auth.middleware');
const { ensureReplicaSet } = require('../../src/hub/replicaSet');

/**
 * Hub mode: hotel Hub PC par MongoDB single-node replica set (rs0) chalta hai,
 * is liye createBooking ka TRANSACTION path wahan pehli dafa chalta hai
 * (baqi tests standalone in-memory server par non-transactional path chalate hain).
 * Ye test confirm karta hai ke replica set par bhi concurrent bookings me
 * sirf ek jeetti hai aur baqi saaf 409 Conflict paati hain (500 WriteConflict nahi).
 */
describe('Hub replica set: transactional booking concurrency', () => {
  let mongod;
  let room;
  const tokens = [];

  // Fixed dates purane ho kar test tod dete hain, is liye aaj se relative dates
  const daysFromNow = (n) => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };

  beforeAll(async () => {
    // Hub jaisa setup: mongod --replSet rs0, phir hamara hub helper usay initiate karta hai.
    // MongoMemoryReplSet (aur memory-server ka `replSet` option) Jest ke andar apne
    // mongodb@7 driver se connect karte hain jo handshake me fail hota hai, is liye
    // --replSet raw arg ki tarah diya hai aur initiate hamara helper karta hai.
    mongod = await MongoMemoryServer.create({
      instance: { args: ['--replSet', 'rs0'], storageEngine: 'wiredTiger' },
      binary: { checkMD5: false },
    });
    const host = `127.0.0.1:${mongod.instanceInfo.port}`;
    await ensureReplicaSet({ host, replSetName: 'rs0' });
    await mongoose.connect(`mongodb://${host}/hub_replset_test?replicaSet=rs0`);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    await Promise.all(
      Object.values(mongoose.connection.collections).map((c) => c.deleteMany({}))
    );
    await Room.init();
    await Booking.init();

    room = await Room.create({
      roomNumber: 'HUB-201',
      type: 'deluxe',
      description: 'Hub replica set room',
      capacity: 2,
      pricePerNight: 120,
      housekeepingStatus: 'clean',
    });

    tokens.length = 0;
    for (let i = 0; i < 6; i += 1) {
      const user = await User.create({
        name: `Hub Racer ${i}`,
        email: `hub-racer-${i}@test.com`,
        password: 'Password123!',
        role: 'user',
      });
      tokens.push(generateAccessToken(user._id));
    }
  });

  it('runs on a replica set with a primary (transactions enabled)', () => {
    const client = mongoose.connection.getClient();
    expect(client.topology.description.type).toBe('ReplicaSetWithPrimary');
  });

  it('lets exactly one of 6 concurrent overlapping bookings win; the rest get 409', async () => {
    const checkInDate = daysFromNow(30);
    const checkOutDate = daysFromNow(33);

    const responses = await Promise.all(
      tokens.map((token, i) =>
        request(app)
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${token}`)
          .set('Idempotency-Key', `hub-race-${i}`)
          .send({
            roomIds: [room._id.toString()],
            checkInDate,
            checkOutDate,
            numberOfGuests: 2,
            paymentMethod: 'pay_at_desk',
          })
      )
    );

    const statuses = responses.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409, 409]);

    expect(await Booking.countDocuments({ 'rooms.roomId': room._id })).toBe(1);

    const fresh = await Room.findById(room._id).lean();
    expect(fresh.reservedRanges).toHaveLength(1);
  });

  it('allows back-to-back (non-overlapping) bookings on the same room', async () => {
    const a = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${tokens[0]}`)
      .set('Idempotency-Key', 'hub-seq-a')
      .send({
        roomIds: [room._id.toString()],
        checkInDate: daysFromNow(40),
        checkOutDate: daysFromNow(42),
        numberOfGuests: 1,
        paymentMethod: 'pay_at_desk',
      });
    const b = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${tokens[1]}`)
      .set('Idempotency-Key', 'hub-seq-b')
      .send({
        roomIds: [room._id.toString()],
        checkInDate: daysFromNow(42),
        checkOutDate: daysFromNow(44),
        numberOfGuests: 1,
        paymentMethod: 'pay_at_desk',
      });

    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    const fresh = await Room.findById(room._id).lean();
    expect(fresh.reservedRanges).toHaveLength(2);
  });
});
