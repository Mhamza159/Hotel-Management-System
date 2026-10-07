const ApiError = require('../utils/apiError');

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
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Too many requests from this IP, please try again later.',
    skipInTest = true,
  } = options;

  return (req, res, next) => {
    // Bypass in test or development environment if configured
    if (skipInTest && (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development')) {
      return next();
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const key = `${req.baseUrl || ''}:${ip}`;
    const now = Date.now();

    let record = defaultStore.hits.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      defaultStore.hits.set(key, record);
    } else {
      record.count += 1;
    }

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
  max: 20,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
  skipInTest: true,
});

const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Too many API requests from this IP, please try again later.',
  skipInTest: true,
});

module.exports = {
  createRateLimiter,
  authLimiter,
  generalLimiter,
  rateLimiterStore: defaultStore,
};
