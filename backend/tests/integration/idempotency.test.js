const request = require('supertest');
const express = require('express');
const idempotency = require('../../src/middlewares/idempotency.middleware');
const IdempotencyKey = require('../../src/models/IdempotencyKey');
const { errorHandler } = require('../../src/middlewares/error.middleware');
const dbHelper = require('../fixtures/db-helper');

describe('Idempotency Middleware Integration Tests', () => {
  let app;
  let handlerCallCount;
  const mockUser = {
    _id: '60d5ec49f1b2c82b8c8e9999',
    email: 'guest@hotel.com',
  };

  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterAll(async () => {
    await dbHelper.disconnect();
  });

  beforeEach(async () => {
    await dbHelper.clearDatabase();
    handlerCallCount = 0;

    app = express();
    app.use(express.json());

    // Fake authentication middleware for testing
    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });

    // Test route with idempotency protection
    app.post('/api/test-charge', idempotency({ required: false }), (req, res) => {
      handlerCallCount++;
      return res.status(201).json({
        success: true,
        bookingId: 'BK-' + Date.now(),
        amount: req.body.amount || 150,
      });
    });

    // Route requiring idempotency key
    app.post('/api/strict-charge', idempotency({ required: true }), (req, res) => {
      return res.status(200).json({ success: true });
    });

    app.use(errorHandler);
  });

  it('executes handler on first request and returns fresh response', async () => {
    const key = 'test-key-001';
    const res = await request(app)
      .post('/api/test-charge')
      .set('Idempotency-Key', key)
      .send({ amount: 200 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.amount).toBe(200);
    expect(handlerCallCount).toBe(1);

    // Verify record saved in database
    const saved = await IdempotencyKey.findOne({ key, userId: mockUser._id });
    expect(saved).not.toBeNull();
  });

  it('returns cached response on duplicate request without executing handler again', async () => {
    const key = 'test-key-duplicate-002';

    // First request
    const firstRes = await request(app)
      .post('/api/test-charge')
      .set('Idempotency-Key', key)
      .send({ amount: 350 });

    expect(firstRes.status).toBe(201);
    expect(handlerCallCount).toBe(1);
    const firstBookingId = firstRes.body.bookingId;

    // Second request with IDENTICAL key
    const secondRes = await request(app)
      .post('/api/test-charge')
      .set('Idempotency-Key', key)
      .send({ amount: 350 });

    expect(secondRes.status).toBe(201);
    // Crucial: Exact same cached bookingId is returned!
    expect(secondRes.body.bookingId).toBe(firstBookingId);
    // Crucial: Handler was NOT called a second time!
    expect(handlerCallCount).toBe(1);
  });

  it('returns 409 Conflict if a request with same key is currently in-progress', async () => {
    const key = 'test-key-in-flight';

    // Manually insert an in-progress record
    await IdempotencyKey.create({
      key,
      userId: mockUser._id,
      path: '/api/test-charge',
      status: 'in-progress',
    });

    const res = await request(app)
      .post('/api/test-charge')
      .set('Idempotency-Key', key)
      .send({ amount: 100 });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('currently being processed');
    expect(handlerCallCount).toBe(0);
  });

  it('returns 400 Bad Request if key is required but missing', async () => {
    const res = await request(app)
      .post('/api/strict-charge')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Idempotency-Key header is required');
  });
});
