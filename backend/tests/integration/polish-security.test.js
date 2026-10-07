const request = require('supertest');
const app = require('../../src/app');
const dbHelper = require('../fixtures/db-helper');
const User = require('../../src/models/User');
const Room = require('../../src/models/Room');
const Coupon = require('../../src/models/Coupon');
const { generateAccessToken } = require('../../src/middlewares/auth.middleware');
const { createRateLimiter, rateLimiterStore } = require('../../src/middlewares/rateLimiter.middleware');
const { ROLES } = require('../../src/config/constants');
const express = require('express');

describe('Phase 9: Polish & Cross-Cutting Concerns Integration Tests', () => {
  let superAdminUser, superAdminToken;
  let guestUser, guestToken;
  let testRoom;

  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterAll(async () => {
    await dbHelper.disconnect();
  });

  beforeEach(async () => {
    await dbHelper.clearDatabase();
    await User.init();
    await Room.init();
    await Coupon.init();

    // 1. Create Super-Admin
    superAdminUser = await User.create({
      name: 'System Super Admin',
      email: 'admin@hotel.com',
      password: 'Password123!',
      role: ROLES.SUPER_ADMIN,
    });
    superAdminToken = generateAccessToken(superAdminUser);

    // 2. Create Guest User
    guestUser = await User.create({
      name: 'Valid Guest',
      email: 'guest@hotel.com',
      password: 'Password123!',
      role: ROLES.GUEST,
    });
    guestToken = generateAccessToken(guestUser);

    // 3. Create Sample Room
    testRoom = await Room.create({
      roomNumber: '901',
      type: 'deluxe',
      description: 'Sample deluxe room for testing',
      pricePerNight: 200,
      capacity: 2,
      housekeepingStatus: 'clean',
      isActive: true,
      isDeleted: false,
    });
  });

  // ==========================================================================
  // 1. JOI SCHEMA VALIDATION TESTS (POLISH-01)
  // ==========================================================================
  describe('1. Joi Schema Input Validation', () => {
    it('rejects registration with malformed email or short password with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Invalid User',
          email: 'not-an-email',
          password: '123', // Less than 6 characters
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors.some((e) => e.includes('email'))).toBe(true);
      expect(res.body.errors.some((e) => e.includes('password'))).toBe(true);
    });

    it('accepts valid registration payload through Joi validation', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Valid New User',
          email: 'newuser@hotel.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('newuser@hotel.com');
    });

    it('rejects room creation with negative price or capacity with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          roomNumber: '999',
          type: 'deluxe',
          pricePerNight: -50,
          capacity: 0,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('rejects booking when checkOutDate is before checkInDate with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          roomIds: [testRoom._id.toString()],
          checkInDate: '2026-10-15',
          checkOutDate: '2026-10-10', // Invalid: prior to checkInDate
          numberOfGuests: 2,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.some((e) => e.includes('checkOutDate'))).toBe(true);
    });

    it('rejects chat confirmation endpoint when token is missing with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/v1/chat/admin/confirm')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.some((e) => e.includes('confirmationToken'))).toBe(true);
    });
  });

  // ==========================================================================
  // 2. SECURITY HARDENING & RATE LIMITING TESTS (POLISH-02)
  // ==========================================================================
  describe('2. Security Hardening (Helmet & Rate Limiting)', () => {
    it('attaches Helmet security headers to HTTP responses', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
    });

    it('enforces rate limiting when max threshold is exceeded', async () => {
      // Build an isolated test app with active rate limiting
      rateLimiterStore.reset();
      const testApp = express();
      const strictLimiter = createRateLimiter({
        windowMs: 60 * 1000,
        max: 3,
        message: 'Rate limit exceeded for test',
        skipInTest: false, // Explicitly enforce in this unit test
      });

      testApp.get('/test-rate-limit', strictLimiter, (req, res) => {
        res.status(200).json({ status: 'ok' });
      });

      // Request 1: OK
      const r1 = await request(testApp).get('/test-rate-limit');
      expect(r1.status).toBe(200);
      expect(r1.headers['x-ratelimit-remaining']).toBe('2');

      // Request 2: OK
      const r2 = await request(testApp).get('/test-rate-limit');
      expect(r2.status).toBe(200);
      expect(r2.headers['x-ratelimit-remaining']).toBe('1');

      // Request 3: OK (Last allowed)
      const r3 = await request(testApp).get('/test-rate-limit');
      expect(r3.status).toBe(200);
      expect(r3.headers['x-ratelimit-remaining']).toBe('0');

      // Request 4: Rate limit exceeded (HTTP 429)
      const r4 = await request(testApp).get('/test-rate-limit');
      expect(r4.status).toBe(429);
      expect(r4.headers['retry-after']).toBeDefined();
    });
  });

  // ==========================================================================
  // 3. DATABASE SEEDING & PROMOTIONAL COUPONS TESTS (POLISH-03)
  // ==========================================================================
  describe('3. Coupon Model & Promotional Discount Validation', () => {
    it('creates promotional coupons and verifies validity checks', async () => {
      const validCoupon = await Coupon.create({
        code: 'TESTWELCOME15',
        discountType: 'percentage',
        discountValue: 15,
        minBookingAmount: 100,
        validUntil: new Date(Date.now() + 86400000), // Tomorrow
        usageLimit: 10,
        isActive: true,
      });

      expect(validCoupon.code).toBe('TESTWELCOME15');
      expect(validCoupon.isValid(150)).toBe(true);
      // Below minBookingAmount
      expect(validCoupon.isValid(50)).toBe(false);

      // Expired coupon
      const expiredCoupon = await Coupon.create({
        code: 'TESTEXPIRED',
        discountType: 'fixed',
        discountValue: 20,
        validUntil: new Date(Date.now() - 86400000), // Yesterday
        usageLimit: 10,
        isActive: true,
      });

      expect(expiredCoupon.isValid(100)).toBe(false);
    });
  });

  // ==========================================================================
  // 4. END-TO-END VERIFICATION (POLISH-04)
  // ==========================================================================
  describe('4. Full Flow End-to-End Sanity Check', () => {
    it('completes reservation flow with Joi validation passing cleanly', async () => {
      const bookingRes = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          roomIds: [testRoom._id.toString()],
          checkInDate: '2026-11-01',
          checkOutDate: '2026-11-04',
          numberOfGuests: 1,
          paymentMethod: 'cash',
        });

      expect(bookingRes.status).toBe(201);
      expect(bookingRes.body.success).toBe(true);
      expect(bookingRes.body.data.bookingReference).toBeDefined();
    });

    it('allows guest to request password reset and successfully reset password', async () => {
      // 1. Request reset token
      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'guest@hotel.com' });

      expect(forgotRes.status).toBe(200);
      expect(forgotRes.body.data.resetToken).toBeDefined();

      const { resetToken } = forgotRes.body.data;

      // 2. Reset password using token
      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'BrandNewPassword123!',
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // 3. Log in with new password
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'guest@hotel.com',
          password: 'BrandNewPassword123!',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.tokens.accessToken).toBeDefined();

      // 4. Old password should fail
      const oldLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'guest@hotel.com',
          password: 'Password123!',
        });

      expect(oldLoginRes.status).toBe(401);
    });

    it('allows Super-Admin to query global bookings directory with pagination and filters', async () => {
      // Create a booking first
      await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          roomIds: [testRoom._id.toString()],
          checkInDate: '2026-12-10',
          checkOutDate: '2026-12-12',
          numberOfGuests: 1,
          paymentMethod: 'cash',
        });

      const res = await request(app)
        .get('/api/v1/admin/bookings?page=1&limit=5')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.bookings)).toBe(true);
      expect(res.body.data.bookings.length).toBeGreaterThan(0);
      expect(res.body.data.pagination.total).toBeGreaterThan(0);

      // Denies regular guest without bookings:view permission
      const guestRes = await request(app)
        .get('/api/v1/admin/bookings')
        .set('Authorization', `Bearer ${guestToken}`);

      expect(guestRes.status).toBe(403);
    });

    it('serves interactive Swagger documentation at /api-docs', async () => {
      const res = await request(app).get('/api-docs/');

      // swaggerUi returns 200 HTML page or redirect
      expect([200, 301, 302]).toContain(res.status);
    });
  });
});
