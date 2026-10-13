const request = require('supertest');
const app = require('../../src/app');

/**
 * ============================================================================
 * STAFF DESKTOP CORS TESTS
 * ============================================================================
 *
 * CORS ka origin check sirf production me strict hota hai, is liye yeh tests
 * request ke dauran NODE_ENV ko temporarily 'production' set karte hain.
 */
describe('CORS for the staff desktop app', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('allows the Electron desktop origin app://hotel in production', async () => {
    const res = await request(app).get('/health').set('Origin', 'app://hotel');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('app://hotel');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('allows the Android staff app origin http://localhost in production', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://localhost');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost');
  });

  it('answers the desktop preflight for authenticated API calls', async () => {
    const res = await request(app)
      .options('/api/v1/auth/me')
      .set('Origin', 'app://hotel')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization,content-type');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('app://hotel');
  });

  it('still rejects unknown origins in production', async () => {
    const res = await request(app).get('/health').set('Origin', 'https://evil.example.com');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    // Bina CORS headers ke jawab (pehle server 500 error banata tha)
    expect(res.status).toBe(200);
  });

  it('can stop trusting every *.vercel.app site with CORS_ALLOW_VERCEL_PREVIEWS=false', async () => {
    const previous = process.env.CORS_ALLOW_VERCEL_PREVIEWS;
    try {
      const open = await request(app).get('/health').set('Origin', 'https://someone-else.vercel.app');
      expect(open.headers['access-control-allow-origin']).toBe('https://someone-else.vercel.app');

      process.env.CORS_ALLOW_VERCEL_PREVIEWS = 'false';
      const closed = await request(app).get('/health').set('Origin', 'https://someone-else.vercel.app');
      expect(closed.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      if (previous === undefined) delete process.env.CORS_ALLOW_VERCEL_PREVIEWS;
      else process.env.CORS_ALLOW_VERCEL_PREVIEWS = previous;
    }
  });
});
