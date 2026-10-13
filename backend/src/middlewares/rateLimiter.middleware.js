const ApiError = require('../utils/apiError');
const config = require('../config/env');
const { isTest, isLocalDevelopment } = require('../utils/runtime');

/**
 * ============================================================================
 * RATE LIMITER MIDDLEWARE (POLISH-02)
 * ============================================================================
 * 
 * In-memory sliding window rate limiter designed to mitigate brute-force
 * credential stuffing and API abuse/DDoS.
 * 
 * Auto-bypasses when NODE_ENV === 'test' to avoid throttling automated test suites,
 * while supporting explicit testing via custom options.
 */

class RateLimiterStore {
  constructor() {
    this.hits = new Map();
    // Auto purge entries every 10 minutes to prevent memory leaks
    this.cleanupInterval = setInterval(() => this.cleanup(), 10 * 60 * 1000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.hits.entries()) {
      if (now > record.resetTime) {
        this.hits.delete(key);
      }
    }
  }

  reset() {
    this.hits.clear();
  }
}

const defaultStore = new RateLimiterStore();

/**
 * Factory function creating a configurable rate limiting middleware.
 *
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 mins)
 * @param {number} options.max - Max allowed requests per window (default: 100)
 * @param {string} options.message - Error message when limit reached
 * @param {boolean} options.skipInTest - Skip enforcement in test env (default: true)
 * @returns {Function} Express middleware
 */
/** Is instance ki memory me ginti (ek server par theek; kai instances me kamzor) */
const memoryHit = (key, windowMs, now) => {
  let record = defaultStore.hits.get(key);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    defaultStore.hits.set(key, record);
  } else {
    record.count += 1;
  }
  return record;
};

/**
 * Database me ginti — saare instances (Vercel) ek hi counter dekhte hain. Ek atomic
 * update: window guzar chuki ho to 1 se dobara, warna +1. Database na mile to memory.
 */
const mongoHit = async (key, windowMs, now) => {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) return memoryHit(key, windowMs, now);
  try {
    const RateLimitHit = require('../models/RateLimitHit');
    const current = new Date(now);
    const stillOpen = { $gt: [{ $ifNull: ['$resetAt', new Date(0)] }, current] };
    const doc = await RateLimitHit.collection.findOneAndUpdate(
      { _id: key },
      [
        {
          $set: {
            count: { $cond: [stillOpen, { $add: ['$count', 1] }, 1] },
            resetAt: { $cond: [stillOpen, '$resetAt', new Date(now + windowMs)] },
          },
        },
      ],
      { upsert: true, returnDocument: 'after' }
    );
    const record = doc && doc.value !== undefined ? doc.value : doc;
    return { count: record.count, resetTime: new Date(record.resetAt).getTime() };
  } catch (error) {
    return memoryHit(key, windowMs, now);
  }
};

const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Too many requests from this IP, please try again later.',
    skipInTest = true,
    // 'mongo': saare server instances ek counter share karein (login jaise hassas routes)
    store = 'memory',
  } = options;

  return async (req, res, next) => {
    // Bypass in test or development environment if configured
    // Sirf tests aur developer ki machine par band — Vercel par NODE_ENV=development ho tab bhi chalta hai
    if (skipInTest && (isTest() || isLocalDevelopment())) {
      return next();
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const key = `${req.baseUrl || ''}:${ip}`;
    const now = Date.now();

    const record = store === 'mongo' ? await mongoHit(key, windowMs, now) : memoryHit(key, windowMs, now);

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (record.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      return next(new ApiError(429, message));
    }

    next();
  };
};

// Preset limiters
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: config.rateLimit.authMax,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
  skipInTest: true,
  // Password guessing har instance par alag ginti se bach nikalti thi
  store: 'mongo',
});

const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: config.rateLimit.max,
  message: 'Too many API requests from this IP, please try again later.',
  skipInTest: true,
});

module.exports = {
  createRateLimiter,
  mongoHit,
  authLimiter,
  generalLimiter,
  rateLimiterStore: defaultStore,
};
