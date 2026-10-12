const crypto = require('crypto');
const request = require('supertest');
const app = require('../../src/app');
const dbHelper = require('../fixtures/db-helper');
const User = require('../../src/models/User');
const RevokedToken = require('../../src/models/RevokedToken');
const { mongoHit } = require('../../src/middlewares/rateLimiter.middleware');

/**
 * ============================================================================
 * MEDIUM BATCH 4: SESSIONS + SHARED LOGIN RATE LIMIT
 * ============================================================================
 * Pehle logout sirf browser me hota tha aur refresh token 7 din chalta rehta;
 * login limiter har server instance ki memory me ginta tha.
 */
describe('Session revocation and shared rate limits (medium batch 4)', () => {
  const credentials = { email: 'session@example.com', password: 'Password123!' };

  const login = async () => {
    const res = await request(app).post('/api/v1/auth/login').send(credentials);
    expect(res.status).toBe(200);
    return res.body.data.tokens;
  };
  const me = (accessToken) => request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${accessToken}`);
  const refresh = (refreshToken) => request(app).post('/api/v1/auth/refresh-token').send({ refreshToken });

  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterAll(async () => {
    await dbHelper.disconnect();
  });

  beforeEach(async () => {
    await dbHelper.clearDatabase();
    await RevokedToken.init();
    await User.create({ name: 'Session User', ...credentials });
  });

  it('rotates refresh tokens and refuses a rotated token after the grace window', async () => {
    const first = await login();
    const rotated = await refresh(first.refreshToken);
    expect(rotated.status).toBe(200);
    const second = rotated.body.data.tokens;
    expect(second.refreshToken).not.toBe(first.refreshToken);

    // Grace window (do tabs) ke andar dobara chal jata hai
    expect((await refresh(first.refreshToken)).status).toBe(200);

    // Grace ke baad purana token bekaar (chori hua token dobara istemal)
    await RevokedToken.updateMany({}, { $set: { revokedAt: new Date(Date.now() - 60 * 1000) } });
    expect((await refresh(first.refreshToken)).status).toBe(401);
    expect((await refresh(second.refreshToken)).status).toBe(200);
  });

  it('logout revokes this device\'s refresh token immediately', async () => {
    const tokens = await login();
    const out = await request(app).post('/api/v1/auth/logout').send({ refreshToken: tokens.refreshToken });
    expect(out.status).toBe(200);
    expect((await refresh(tokens.refreshToken)).status).toBe(401);

    // Doosra device chalta rehta hai
    const other = await login();
    expect((await refresh(other.refreshToken)).status).toBe(200);
  });

  it('logout with a junk token still answers 200', async () => {
    const res = await request(app).post('/api/v1/auth/logout').send({ refreshToken: 'not-a-jwt' });
    expect(res.status).toBe(200);
  });

  it('logout-all ends every session of the account', async () => {
    const deviceA = await login();
    const deviceB = await login();

    const all = await request(app).post('/api/v1/auth/logout-all').set('Authorization', `Bearer ${deviceA.accessToken}`);
    expect(all.status).toBe(200);

    expect((await me(deviceA.accessToken)).status).toBe(401);
    expect((await me(deviceB.accessToken)).status).toBe(401);
    expect((await refresh(deviceB.refreshToken)).status).toBe(401);
    expect((await me((await login()).accessToken)).status).toBe(200);
  });

  it('a password reset ends existing sessions', async () => {
    const tokens = await login();
    const user = await User.findOne({ email: credentials.email });
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const reset = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, newPassword: 'NewPassword456!' });
    expect(reset.status).toBe(200);

    expect((await me(tokens.accessToken)).status).toBe(401);
    expect((await refresh(tokens.refreshToken)).status).toBe(401);
  });

  it('counts login attempts in the database so every server instance shares one limit', async () => {
    const key = `/api/v1/auth:${crypto.randomUUID()}`;
    const now = Date.now();
    // Do "instances" (alag memory) ek hi database counter dekhte hain
    expect((await mongoHit(key, 60000, now)).count).toBe(1);
    expect((await mongoHit(key, 60000, now + 10)).count).toBe(2);
    expect((await mongoHit(key, 60000, now + 20)).count).toBe(3);
    // Window guzarne par dobara 1 se
    expect((await mongoHit(key, 60000, now + 61000)).count).toBe(1);
  });
});
