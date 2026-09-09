const request = require('supertest');

function loadAppWithEnv(env, extraEnv = {}) {
  let app;

  jest.isolateModules(() => {
    jest.doMock('mongoose', () => {
      const actualMongoose = jest.requireActual('mongoose');

      return {
        ...actualMongoose,
        connection: {
          readyState: extraEnv.dbReadyState ?? 1,
        },
        Schema: actualMongoose.Schema,
      };
    });

    process.env.NODE_ENV = env;
    process.env.FRONTEND_URL = extraEnv.FRONTEND_URL || 'https://example.com';
    process.env.RATE_LIMIT_MAX = extraEnv.RATE_LIMIT_MAX || '300';

    app = require('../src/app');
  });

  return app;
}

describe('App.js Production Configuration', () => {
  let originalEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('sets trust proxy to 1 when NODE_ENV=production', () => {
    const app = loadAppWithEnv('production');

    expect(app.get('trust proxy')).toBe(1);
  });

  it('does NOT set trust proxy when NODE_ENV=development', () => {
    const app = loadAppWithEnv('development');

    expect(app.get('trust proxy')).toBe(false);
  });

  it('adds production request logging middleware when NODE_ENV=production', async () => {
    const mockLogger = {
      info: jest.fn(),
    };

    jest.doMock('../src/utils/logger', () => ({
      logger: mockLogger,
      asyncLocalStorage: {
        run: jest.fn((_, cb) => cb()),
      },
    }));

    const app = loadAppWithEnv('production');

    await request(app).get('/');

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Request completed',
      expect.objectContaining({
        method: 'GET',
        url: '/',
        status: 200,
        duration: expect.stringMatching(/^\d+ms$/),
      }),
    );
  });

  it('does NOT add production logging middleware when not in production', async () => {
    const mockLogger = {
      info: jest.fn(),
    };

    jest.doMock('../src/utils/logger', () => ({
      logger: mockLogger,
      asyncLocalStorage: {
        run: jest.fn((_, cb) => cb()),
      },
    }));

    const app = loadAppWithEnv('development');

    await request(app).get('/');

    expect(mockLogger.info).not.toHaveBeenCalledWith(
      'Request completed',
      expect.any(Object),
    );
  });

  it('handles 404 for unknown routes', async () => {
    const app = loadAppWithEnv('development');

    const res = await request(app).get('/this-route-does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('fail');
    expect(res.body.message).toMatch(/Can't find/);
  });

  it('applies global rate limiter', async () => {
    const app = loadAppWithEnv('development', {
      RATE_LIMIT_MAX: '1',
    });

    const res1 = await request(app).get('/');

    expect(res1.status).toBe(200);

    const res2 = await request(app).get('/');

    expect(res2.status).toBe(429);
    expect(res2.text).toMatch(/Too many requests/);
  });

  it('allows CORS for allowed origins', async () => {
    const app = loadAppWithEnv('development', {
      FRONTEND_URL: 'http://localhost:3000',
    });

    const res = await request(app)
      .get('/')
      .set('Origin', 'http://localhost:3000');

    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    );

    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('rejects CORS for disallowed origins', async () => {
    const app = loadAppWithEnv('development', {
      FRONTEND_URL: 'http://localhost:3000',
    });

    const res = await request(app).get('/').set('Origin', 'http://evil.com');

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Origin .* not allowed by CORS/);
  });

  it('serves Swagger UI in development', async () => {
    const app = loadAppWithEnv('development');

    const res = await request(app).get('/api-docs/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('does NOT serve Swagger UI in production', async () => {
    const app = loadAppWithEnv('production');

    const res = await request(app).get('/api-docs/');

    expect(res.status).toBe(404);
  });

  it('health check returns 200 when DB is connected', async () => {
    const app = loadAppWithEnv('development', {
      dbReadyState: 1,
    });

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body).toHaveProperty('uptime');
  });

  it('health check returns 503 if DB is disconnected', async () => {
    const app = loadAppWithEnv('development', {
      dbReadyState: 0,
    });

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body.message).toBe('Database connection unavailable');
  });
});
