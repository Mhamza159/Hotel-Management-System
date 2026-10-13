const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const dbHelper = require('../fixtures/db-helper');
const Room = require('../../src/models/Room');
const User = require('../../src/models/User');
const { generateAccessToken } = require('../../src/middlewares/auth.middleware');

/**
 * ============================================================================
 * STAFF WITH EVERY PERMISSION SWITCHED OFF
 * ============================================================================
 * User report: housekeeping ki saari permissions off karne ke baad bhi saare
 * modules khulte the. Admin PBAC page se (PATCH /auth/users/:id/permissions)
 * sab band karta hai; us ke baad har staff API 403 deni chahiye.
 */
describe('Staff whose permissions were all switched off', () => {
  let hkToken;
  let room;

  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterAll(async () => {
    await dbHelper.disconnect();
  });

  beforeEach(async () => {
    await dbHelper.clearDatabase();
    const admin = await User.create({ name: 'Admin', email: 'admin.revoke@example.com', password: 'Password123!', role: 'super-admin' });
    const hk = await User.create({ name: 'HK', email: 'hk.revoke@example.com', password: 'Password123!', role: 'housekeeping' });
    room = await Room.create({ roomNumber: 'R-1', type: 'deluxe', description: 'x', capacity: 2, pricePerNight: 100 });

    // Admin PBAC page se sab band
    const off = await request(app)
      .patch(`/api/v1/auth/users/${hk._id}/permissions`)
      .set('Authorization', `Bearer ${generateAccessToken(String(admin._id))}`)
      .send({ role: 'housekeeping', permissions: [] });
    expect(off.status).toBe(200);
    expect((await User.findById(hk._id).lean()).permissions).toEqual([]);

    hkToken = generateAccessToken(String(hk._id));
  });

  it('gets 403 from every staff module API', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const calls = [
      ['get', '/api/v1/rooms/admin/all'],
      ['patch', `/api/v1/rooms/${room._id}/housekeeping`, { housekeepingStatus: 'dirty' }],
      ['patch', `/api/v1/rooms/${room._id}`, { description: 'changed' }],
      ['post', '/api/v1/rooms', { roomNumber: 'X-1', type: 'deluxe', capacity: 2, pricePerNight: 50 }],
      ['delete', `/api/v1/rooms/${room._id}`],
      ['get', '/api/v1/desk/bookings'],
      ['get', '/api/v1/desk/rooms-allotment-status'],
      ['get', '/api/v1/desk/cancellation-requests'],
      ['get', `/api/v1/desk/bookings/${fakeId}/cancellation-review`],
      ['patch', `/api/v1/desk/bookings/${fakeId}/check-in`, {}],
      ['patch', `/api/v1/desk/bookings/${fakeId}/check-out`, {}],
      ['patch', `/api/v1/desk/bookings/${fakeId}/allot-rooms`, { allocations: [] }],
      ['post', `/api/v1/desk/bookings/${fakeId}/payments`, { amount: 1, paymentMethod: 'cash' }],
      ['post', '/api/v1/desk/walk-in', {}],
      ['get', '/api/v1/admin/bookings'],
      ['get', '/api/v1/admin/audit-log'],
      ['get', '/api/v1/admin/analytics/revenue'],
      ['get', '/api/v1/admin/analytics/occupancy'],
      ['get', '/api/v1/admin/analytics/payments/search'],
      ['get', '/api/v1/auth/staff'],
      ['get', '/api/v1/auth/permissions'],
      ['post', '/api/v1/chat/staff', { message: 'hi' }],
    ];

    const leaks = [];
    for (const [method, url, body] of calls) {
      let req = request(app)[method](url).set('Authorization', `Bearer ${hkToken}`);
      if (body) req = req.send(body);
      const res = await req;
      if (res.status !== 403) leaks.push(`${method.toUpperCase()} ${url} -> ${res.status}`);
    }
    expect(leaks).toEqual([]);
  });

  it('reports the empty permission list on /auth/me so the app hides every module', async () => {
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${hkToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.permissions).toEqual([]);
  });
});
