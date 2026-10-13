/**
 * END-TO-END: hotel hub <-> cloud sync over real HTTP.
 *
 * Cloud = asal src/server.js alag process me (apna in-memory MongoDB).
 * Hub   = isi test process me (doosra in-memory MongoDB), HubSyncAgent.runOnce()
 *         haath se chalaya jata hai.
 */
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const { spawn } = require('child_process');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(120000);

const SYNC_KEY = crypto.randomBytes(32).toString('hex');
const HUB_OFFLINE_AFTER_MS = 10000;
const SYNC_ENV_KEYS = ['SYNC_NODE', 'SYNC_SHARED_KEY', 'CLOUD_SYNC_URL', 'SYNC_SETTLE_MS', 'HUB_OFFLINE_AFTER_MS', 'HUB_OFFLINE_BOOKING_GATE'];

const freePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });

const daysFromNow = (n) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('Hub <-> cloud sync (end to end)', () => {
  let hubMongo;
  let cloudMongo;
  let cloudProcess;
  let cloudLog = '';
  let cloudUrl;
  let cloudDb; // raw connection to inspect the cloud database
  const savedEnv = {};

  // Hub modules (config padhne se pehle env set hona zaroori hai)
  let HubSyncAgent;
  let Room;
  let User;
  let Booking;
  let BookingService;
  let hubApp;

  let rooms = [];
  let guestToken;
  let hotelRef;
  let webConflictRef;

  const cloud = () => request(cloudUrl);
  const cloudRoom = (id) => cloudDb.collection('rooms').findOne({ _id: id });
  const cloudBooking = (filter) => cloudDb.collection('bookings').findOne(filter);
  const guestBooks = (roomId, checkInDate, checkOutDate) =>
    cloud()
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ roomIds: [String(roomId)], checkInDate, checkOutDate, numberOfGuests: 1, paymentMethod: 'pay_at_desk' });

  const syncOnce = async () => {
    const result = await HubSyncAgent.runOnce();
    expect(result.error).toBeUndefined();
    return result;
  };

  beforeAll(async () => {
    [hubMongo, cloudMongo] = await Promise.all([
      MongoMemoryServer.create({ binary: { checkMD5: false } }),
      MongoMemoryServer.create({ binary: { checkMD5: false } }),
    ]);

    // ---------------- cloud process
    const port = await freePort();
    cloudUrl = `http://127.0.0.1:${port}`;
    cloudProcess = spawn(process.execPath, ['src/server.js'], {
      cwd: path.resolve(__dirname, '../..'),
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        // Asal backend/.env (production) bilkul na parha jaye
        HOTEL_ENV_FILE: path.resolve(__dirname, 'does-not-exist.env'),
        NODE_ENV: 'test',
        PORT: String(port),
        MONGO_URI: cloudMongo.getUri('cloud_e2e'),
        JWT_SECRET: crypto.randomBytes(24).toString('hex'),
        JWT_REFRESH_SECRET: crypto.randomBytes(24).toString('hex'),
        SYNC_NODE: 'cloud',
        SYNC_SHARED_KEY: SYNC_KEY,
        SYNC_SETTLE_MS: '0',
        HUB_OFFLINE_AFTER_MS: String(HUB_OFFLINE_AFTER_MS),
        // Ye test option 1 (gate on) ko check karta hai; default me gate band hai
        HUB_OFFLINE_BOOKING_GATE: 'true',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    cloudProcess.stdout.on('data', (d) => { cloudLog += d; });
    cloudProcess.stderr.on('data', (d) => { cloudLog += d; });
    for (let i = 0; i < 60; i += 1) {
      try {
        const res = await fetch(`${cloudUrl}/health`);
        if (res.ok) break;
      } catch (e) {
        // not up yet
      }
      await sleep(250);
    }
    cloudDb = mongoose.createConnection(cloudMongo.getUri('cloud_e2e'));
    await cloudDb.asPromise();

    // ---------------- hub (this process)
    for (const key of SYNC_ENV_KEYS) savedEnv[key] = process.env[key];
    Object.assign(process.env, {
      SYNC_NODE: 'hub',
      SYNC_SHARED_KEY: SYNC_KEY,
      CLOUD_SYNC_URL: `${cloudUrl}/api/v1`,
      SYNC_SETTLE_MS: '0',
    });
    HubSyncAgent = require('../../src/sync/hubAgent');
    Room = require('../../src/models/Room');
    User = require('../../src/models/User');
    Booking = require('../../src/models/Booking');
    BookingService = require('../../src/services/booking.service');
    hubApp = require('../../src/app');
    await mongoose.connect(hubMongo.getUri('hub_e2e'));
    await Promise.all([Room.init(), User.init(), Booking.init()]);
  });

  afterAll(async () => {
    if (cloudProcess) cloudProcess.kill();
    await mongoose.disconnect();
    if (cloudDb) await cloudDb.close();
    await Promise.all([hubMongo && hubMongo.stop(), cloudMongo && cloudMongo.stop()]);
    for (const key of SYNC_ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  it('cloud is up and closes online booking until the hub has synced', async () => {
    const health = await fetch(`${cloudUrl}/health`).catch(() => null);
    if (!health || !health.ok) throw new Error(`Cloud did not start:\n${cloudLog}`);

    const availability = await cloud().get('/api/v1/sync/availability');
    expect(availability.body.data).toMatchObject({ available: false, reason: 'hotel-offline' });

    const register = await cloud()
      .post('/api/v1/auth/register')
      .send({ name: 'Web Guest', email: 'web.guest@example.com', password: 'GuestPass123' });
    expect(register.status).toBe(201);
    guestToken = register.body.data.tokens.accessToken;

    const blocked = await guestBooks(new mongoose.Types.ObjectId(), daysFromNow(10), daysFromNow(12));
    expect(blocked.status).toBe(503);
    expect(blocked.body.message).toMatch(/temporarily unavailable/i);
  });

  it('rejects sync calls without the shared key', async () => {
    const res = await cloud().post('/api/v1/sync/pull').set('Authorization', 'Bearer wrong-key').send({});
    expect(res.status).toBe(401);
  });

  it('pushes hub rooms to the cloud and reopens online booking', async () => {
    rooms = await Promise.all(
      ['H-101', 'H-102', 'H-103'].map((roomNumber) =>
        Room.create({ roomNumber, type: 'deluxe', description: 'Hub room', capacity: 2, pricePerNight: 120, housekeepingStatus: 'clean' })
      )
    );
    expect(rooms[0].syncOrigin).toBe('hub');

    const result = await syncOnce();
    expect(result.pushed).toBe(3);

    const pushed = await cloudRoom(rooms[0]._id);
    expect(pushed).toMatchObject({ roomNumber: 'H-101', syncOrigin: 'hub' });

    const availability = await cloud().get('/api/v1/sync/availability');
    expect(availability.body.data.available).toBe(true);
  });

  it('brings a website booking (and its guest) down to the hub and locks the room there', async () => {
    const booked = await guestBooks(rooms[0]._id, daysFromNow(10), daysFromNow(12));
    expect(booked.status).toBe(201);
    const ref = booked.body.data.bookingReference;

    const result = await syncOnce();
    expect(result.pulled).toBeGreaterThanOrEqual(1); // booking (guest user pichhle cycle me aa chuka)

    const hubBooking = await Booking.findOne({ bookingReference: ref }).lean();
    expect(hubBooking).toMatchObject({ status: 'confirmed', syncOrigin: 'cloud', syncConflict: null });
    expect(await User.countDocuments({ email: 'web.guest@example.com' })).toBe(1);

    const hubRoom = await Room.findById(rooms[0]._id).lean();
    expect(hubRoom.reservedRanges.map((r) => r.bookingReference)).toEqual([ref]);

    // Hub ab wahi dates kisi aur ko nahi de sakta
    const deskUser = await User.create({ name: 'Desk Guest', email: 'desk.guest@example.com', password: 'Password123!' });
    await expect(
      BookingService.createBooking({
        userId: deskUser._id,
        roomIds: [String(rooms[0]._id)],
        checkInDate: daysFromNow(11),
        checkOutDate: daysFromNow(13),
        numberOfGuests: 1,
        paymentMethod: 'pay_at_desk',
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('flags a website booking that double-books a room the hotel already sold, on both sides', async () => {
    // Hotel desk room H-102 bechta hai (abhi sync nahi hua)...
    const deskGuest = await User.findOne({ email: 'desk.guest@example.com' });
    const hotelBooking = await BookingService.createBooking({
      userId: deskGuest._id,
      roomIds: [String(rooms[1]._id)],
      checkInDate: daysFromNow(20),
      checkOutDate: daysFromNow(22),
      numberOfGuests: 1,
      paymentMethod: 'pay_at_desk',
    });
    // ...aur usi waqt website par guest wahi room un hi dates ke liye book karta hai
    const web = await guestBooks(rooms[1]._id, daysFromNow(21), daysFromNow(23));
    expect(web.status).toBe(201);
    const webRef = web.body.data.bookingReference;
    hotelRef = hotelBooking.bookingReference;
    webConflictRef = webRef;

    const first = await syncOnce();
    expect(first.conflicts).toEqual([
      expect.objectContaining({ collection: 'bookings', bookingReference: webRef, reason: 'room-double-booked' }),
    ]);

    // Hub: hotel ki booking room rakhti hai, website wali flagged aur bina lock
    const hubRoom = await Room.findById(rooms[1]._id).lean();
    expect(hubRoom.reservedRanges.map((r) => r.bookingReference)).toEqual([hotelBooking.bookingReference]);
    const flagged = await Booking.findOne({ bookingReference: webRef }).lean();
    expect(flagged.syncConflict).toMatch(/already booked at the hotel/i);

    // Agla cycle flag cloud tak le jata hai; cloud par bhi website booking ka lock hat jata hai
    await syncOnce();
    const cloudWeb = await cloudBooking({ bookingReference: webRef });
    expect(cloudWeb.syncConflict).toMatch(/already booked at the hotel/i);
    const cloudRoomDoc = await cloudRoom(rooms[1]._id);
    expect(cloudRoomDoc.reservedRanges.map((r) => r.bookingReference)).toEqual([hotelBooking.bookingReference]);

    // Staff status endpoint conflict dikhata hai
    const SyncService = require('../../src/services/sync.service');
    const status = await SyncService.getStatus();
    expect(status).toMatchObject({ node: 'hub', enabled: true, online: true, pendingChanges: 0 });
    expect(status.conflictBookings.map((b) => b.bookingReference)).toContain(webRef);
  });

  it('clears the conflict when the front desk allots a free room, on both sides', async () => {
    const DeskService = require('../../src/services/desk.service');
    const web = await Booking.findOne({ bookingReference: webConflictRef });
    await DeskService.allotRooms(String(web._id), [{ slotIndex: 0, allocatedRoomId: String(rooms[2]._id) }]);

    const resolved = await Booking.findById(web._id).lean();
    expect(resolved.syncConflict).toBeNull();
    expect(String(resolved.rooms[0].roomId)).toBe(String(rooms[2]._id));
    const hubRoom = await Room.findById(rooms[2]._id).lean();
    expect(hubRoom.reservedRanges.map((r) => r.bookingReference)).toContain(webConflictRef);

    await syncOnce();
    const cloudWeb = await cloudBooking({ bookingReference: webConflictRef });
    expect(cloudWeb.syncConflict).toBeNull();
    const cloudRoomDoc = await cloudRoom(rooms[2]._id);
    expect(cloudRoomDoc.reservedRanges.map((r) => r.bookingReference)).toContain(webConflictRef);
  });

  it('syncs a hotel cancellation to the cloud and frees the room online', async () => {
    const hotelBooking = await Booking.findOne({ bookingReference: hotelRef });
    await Booking.updateOne({ _id: hotelBooking._id }, { $set: { status: 'cancelled' } });
    await Room.updateMany(
      { 'reservedRanges.bookingReference': hotelBooking.bookingReference },
      { $pull: { reservedRanges: { bookingReference: hotelBooking.bookingReference } } }
    );

    await syncOnce();
    const cloudCopy = await cloudBooking({ _id: hotelBooking._id });
    expect(cloudCopy.status).toBe('cancelled');
    const cloudRoomDoc = await cloudRoom(hotelBooking.rooms[0].roomId);
    expect(cloudRoomDoc.reservedRanges.map((r) => r.bookingReference)).not.toContain(hotelBooking.bookingReference);
  });

  it('keeps room photos uploaded on the hub locally until it can send them to Cloudinary', async () => {
    const { generateAccessToken } = require('../../src/middlewares/auth.middleware');
    const MediaJob = require('../../src/models/MediaJob');
    const admin = await User.create({ name: 'Hub Admin', email: 'hub.admin@example.com', password: 'Password123!', role: 'super-admin' });
    const token = generateAccessToken(String(admin._id));
    const photo = Buffer.from('fake-jpeg-bytes-for-test');

    const upload = await request(hubApp)
      .post(`/api/v1/rooms/${rooms[0]._id}/images`)
      .set('Authorization', `Bearer ${token}`)
      .attach('images', photo, { filename: 'room.jpg', contentType: 'image/jpeg' });
    expect(upload.status).toBe(200);
    const pending = upload.body.data.images.find((image) => image.publicId.startsWith('pending:'));
    expect(pending.url).toMatch(/\/api\/v1\/media\/pending\/[0-9a-f]{24}$/);

    // Hub khud photo serve karta hai (desktop app <img>, internet ke baghair)
    const served = await request(hubApp).get(new URL(pending.url).pathname);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toMatch(/image\/jpeg/);
    expect(served.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(Buffer.from(served.body).equals(photo)).toBe(true);

    // Sync: photo Cloudinary (test me mock) par jati hai aur pending entry badal jati hai
    const result = await syncOnce();
    expect(result.media.uploaded).toBe(1);
    expect(await MediaJob.countDocuments()).toBe(0);
    const hubRoom = await Room.findById(rooms[0]._id).lean();
    expect(hubRoom.images).toHaveLength(1);
    expect(hubRoom.images[0].url).toMatch(/^https:\/\/res\.cloudinary\.com\//);

    await syncOnce();
    const cloudRoomDoc = await cloudRoom(rooms[0]._id);
    expect(cloudRoomDoc.images.map((image) => image.url)).toEqual([hubRoom.images[0].url]);

    // Hub par delete: Cloudinary se hatana bhi queue hota hai
    const removed = await request(hubApp)
      .delete(`/api/v1/rooms/${rooms[0]._id}/images`)
      .set('Authorization', `Bearer ${token}`)
      .send({ publicId: hubRoom.images[0].publicId });
    expect(removed.status).toBe(200);
    expect(await MediaJob.countDocuments({ type: 'destroy' })).toBe(1);
    const afterDelete = await syncOnce();
    expect(afterDelete.media.destroyed).toBe(1);
    expect((await cloudRoom(rooms[0]._id)).images).toHaveLength(0);
  });

  it('closes online booking again when the hub stops syncing (option 1)', async () => {
    await sleep(HUB_OFFLINE_AFTER_MS + 500);
    const blocked = await guestBooks(rooms[2]._id, daysFromNow(40), daysFromNow(41));
    expect(blocked.status).toBe(503);

    await syncOnce();
    const open = await guestBooks(rooms[2]._id, daysFromNow(40), daysFromNow(41));
    expect(open.status).toBe(201);
  });

  it('reports failures without losing changes when the cloud is unreachable', async () => {
    const SyncState = require('../../src/models/SyncState');
    cloudProcess.kill();
    await sleep(500);

    await Room.updateOne({ _id: rooms[2]._id }, { $set: { pricePerNight: 150 } });
    const result = await HubSyncAgent.runOnce();
    expect(result.error).toBeTruthy();

    const state = await SyncState.findById('hub').lean();
    expect(state.lastError).toBeTruthy();
    expect(await HubSyncAgent.countPending(state.pushCursors)).toBe(1);
  });
});
