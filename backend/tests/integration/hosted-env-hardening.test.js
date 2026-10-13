const request = require('supertest');
const app = require('../../src/app');
const { rateLimiterStore } = require('../../src/middlewares/rateLimiter.middleware');

/**
 * ============================================================================
 * LIVE VERCEL BACKEND NODE_ENV=development ME CHAL RAHA THA
 * ============================================================================
 * Nateeja: rate limiter band, har origin ko CORS, error me stack trace. Ab
 * Vercel (VERCEL=1) par NODE_ENV kuch bhi ho, ye teeno hifazati qaide lagte hain;
 * dheel sirf developer ki apni machine par.
 */
describe('Hosted deployments stay locked down even with NODE_ENV=development', () => {
  const saved = {};

  const setEnv = (values) => {
    for (const [key, value] of Object.entries(values)) {
      if (!(key in saved)) saved[key] = process.env[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rateLimiterStore.reset();
  });

  describe('on Vercel (VERCEL=1, NODE_ENV=development)', () => {
    beforeEach(() => setEnv({ NODE_ENV: 'development', VERCEL: '1' }));

    it('applies the API rate limiter', async () => {
      const res = await request(app).get('/api/v1/does-not-exist');
      expect(res.headers['x-ratelimit-limit']).toBeDefined();
    });

    it('does not grant CORS to unknown origins', async () => {
      const res = await request(app).get('/health').set('Origin', 'https://evil.example.com');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('does not leak stack traces in error responses', async () => {
      const res = await request(app).get('/api/v1/does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body.stack).toBeUndefined();
    });
  });

  describe('on a developer machine (no VERCEL, NODE_ENV=development)', () => {
    beforeEach(() => setEnv({ NODE_ENV: 'development', VERCEL: undefined }));

    it('keeps the debugging conveniences', async () => {
      const res = await request(app).get('/api/v1/does-not-exist').set('Origin', 'http://some-dev-tool.local');
      expect(res.body.stack).toBeDefined();
      expect(res.headers['x-ratelimit-limit']).toBeUndefined();
      expect(res.headers['access-control-allow-origin']).toBe('http://some-dev-tool.local');
    });
  });
});
