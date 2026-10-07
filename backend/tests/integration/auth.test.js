const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const dbHelper = require('../fixtures/db-helper');

describe('Auth API Integration Tests', () => {
  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterAll(async () => {
    await dbHelper.disconnect();
  });

  afterEach(async () => {
    await dbHelper.clearDatabase();
  });

  describe('POST /api/v1/auth/register', () => {
    it('successfully registers a new guest and returns tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Hamza Guest',
          email: 'hamza@example.com',
          password: 'Password123!',
          phone: '+923001234567',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.name).toBe('Hamza Guest');
      expect(res.body.data.user.email).toBe('hamza@example.com');
      expect(res.body.data.user.role).toBe('user');
      expect(res.body.data.user.permissions).toEqual(
        expect.arrayContaining(['bookings:create', 'bookings:view'])
      );
      expect(res.body.data.user.password).toBeUndefined(); // Security: never leaked
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
    });

    it('rejects duplicate email with 409 Conflict', async () => {
      await User.create({
        name: 'Existing User',
        email: 'duplicate@example.com',
        password: 'Password123!',
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Second User',
          email: 'duplicate@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('rejects missing required fields with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'noname@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await User.create({
        name: 'Login User',
        email: 'login@example.com',
        password: 'CorrectPassword123!',
      });
    });

    it('authenticates valid credentials and returns tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'CorrectPassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('rejects incorrect password with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('rejects non-existent email with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'doesnotexist@example.com',
          password: 'CorrectPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    it('rotates tokens when a valid refresh token is supplied', async () => {
      // 1. Register to get valid refresh token
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Refresh Test User',
          email: 'refresh@example.com',
          password: 'Password123!',
        });

      const initialRefreshToken = regRes.body.data.tokens.refreshToken;

      // 2. Call refresh token endpoint
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken: initialRefreshToken,
        });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.data.tokens.accessToken).toBeDefined();
      expect(refreshRes.body.data.tokens.refreshToken).toBeDefined();
    });

    it('rejects malformed refresh token with 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken: 'invalid.jwt.token',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('rejects unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns current user profile and permissions when valid token is supplied', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Profile Tester',
          email: 'profile@example.com',
          password: 'Password123!',
        });

      const token = regRes.body.data.tokens.accessToken;

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('profile@example.com');
      expect(res.body.data.user.permissions).toBeDefined();
    });
  });
});
