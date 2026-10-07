const jwt = require('jsonwebtoken');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  authenticate,
} = require('../../src/middlewares/auth.middleware');
const User = require('../../src/models/User');
const ApiError = require('../../src/utils/apiError');
const config = require('../../src/config/env');
const dbHelper = require('../fixtures/db-helper');

describe('Auth Middleware Unit Verification', () => {
  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterAll(async () => {
    await dbHelper.disconnect();
  });

  afterEach(async () => {
    await dbHelper.clearDatabase();
  });

  describe('Token Generation Helpers', () => {
    it('generates valid access and refresh tokens with correct payload', () => {
      const dummyId = '60d5ec49f1b2c82b8c8e1234';
      const accessToken = generateAccessToken(dummyId);
      const refreshToken = generateRefreshToken(dummyId);

      const decodedAccess = verifyToken(accessToken, config.jwt.secret);
      const decodedRefresh = verifyToken(refreshToken, config.jwt.refreshSecret);

      expect(decodedAccess.id).toBe(dummyId);
      expect(decodedRefresh.id).toBe(dummyId);
    });
  });

  describe('authenticate Middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = { headers: {} };
      res = {};
      next = jest.fn();
    });

    it('throws 401 ApiError when Authorization header is missing', async () => {
      await authenticate(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(ApiError);
      expect(err.statusCode).toBe(401);
      expect(err.message).toContain('Authentication required');
    });

    it('throws 401 ApiError when header does not start with Bearer', async () => {
      req.headers.authorization = 'Basic token123';
      await authenticate(req, res, next);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(ApiError);
      expect(err.statusCode).toBe(401);
    });

    it('throws 401 when token is invalid', async () => {
      req.headers.authorization = 'Bearer invalid.token.value';
      await authenticate(req, res, next);
      const err = next.mock.calls[0][0];
      expect(err).toBeDefined();
    });

    it('throws 401 when user account is deactivated (isActive = false)', async () => {
      const user = await User.create({
        name: 'Deactivated User',
        email: 'deactivated@hotel.com',
        password: 'Password123!',
        isActive: false,
      });

      const token = generateAccessToken(user._id.toString());
      req.headers.authorization = `Bearer ${token}`;

      await authenticate(req, res, next);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(ApiError);
      expect(err.statusCode).toBe(401);
      expect(err.message).toContain('deactivated');
    });

    it('attaches user to req.user and calls next() on valid token', async () => {
      const user = await User.create({
        name: 'Active Guest',
        email: 'active@hotel.com',
        password: 'Password123!',
        isActive: true,
      });

      const token = generateAccessToken(user._id.toString());
      req.headers.authorization = `Bearer ${token}`;

      await authenticate(req, res, next);
      expect(next).toHaveBeenCalledWith(); // Called with no error argument
      expect(req.user).toBeDefined();
      expect(req.user._id.toString()).toBe(user._id.toString());
      expect(req.user.email).toBe('active@hotel.com');
    });
  });
});
