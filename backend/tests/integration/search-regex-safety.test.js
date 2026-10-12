const request = require('supertest');
const app = require('../../src/app');
const dbHelper = require('../fixtures/db-helper');
const Room = require('../../src/models/Room');
const User = require('../../src/models/User');
const escapeRegex = require('../../src/utils/escapeRegex');
const { generateAccessToken } = require('../../src/middlewares/auth.middleware');

/**
 * ============================================================================
 * H7 REGRESSION: SEARCH TEXT IS MATCHED LITERALLY
 * ============================================================================
 * Search boxes user ka text seedha regex bana dete the: "(" se 500 error,
 * "." har harf se match, aur "(a+)+$" jaisa text ReDoS ka khatra.
 */
describe('Search inputs are escaped before building regexes (H7)', () => {
  let adminToken;

  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterAll(async () => {
    await dbHelper.disconnect();
  });

  beforeEach(async () => {
    await dbHelper.clearDatabase();
    const admin = await User.create({ name: 'Admin', email: 'admin.h7@example.com', password: 'Password123!', role: 'super-admin' });
    adminToken = generateAccessToken(String(admin._id));
    await Room.create([
      { roomNumber: '101', type: 'deluxe', description: 'a', capacity: 2, pricePerNight: 100 },
      { roomNumber: '1x1', type: 'deluxe', description: 'b', capacity: 2, pricePerNight: 100 },
      { roomNumber: '1.1', type: 'deluxe', description: 'c', capacity: 2, pricePerNight: 100 },
    ]);
  });

  it('escapes every regex metacharacter and trims long input', () => {
    expect(escapeRegex(' a.b*c(d)[e]{f}|g^h$i+j?k\\l ')).toBe('a\\.b\\*c\\(d\\)\\[e\\]\\{f\\}\\|g\\^h\\$i\\+j\\?k\\\\l');
    expect(escapeRegex('x'.repeat(500))).toHaveLength(100);
    expect(escapeRegex(undefined)).toBe('');
  });

  it('room search treats "." literally', async () => {
    const res = await request(app)
      .get('/api/v1/rooms/admin/all')
      .query({ search: '1.1' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const numbers = (res.body.data.rooms || res.body.data).map((r) => r.roomNumber);
    expect(numbers).toEqual(['1.1']);
  });

  it('search text with regex syntax no longer causes a server error', async () => {
    for (const search of ['(', '[unclosed', '(a+)+$']) {
      const bookings = await request(app)
        .get('/api/v1/admin/bookings')
        .query({ search })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(bookings.status).toBe(200);

      const staff = await request(app)
        .get('/api/v1/auth/staff')
        .query({ search })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(staff.status).toBe(200);
    }
  });
});
