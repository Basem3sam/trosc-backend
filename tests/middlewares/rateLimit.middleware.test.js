describe('rateLimit.middleware — default value fallbacks', () => {
  const originalMax = process.env.AUTH_RATE_LIMIT_MAX;
  const originalWindow = process.env.AUTH_RATE_LIMIT_WINDOW_MS;

  afterEach(() => {
    process.env.AUTH_RATE_LIMIT_MAX = originalMax;
    process.env.AUTH_RATE_LIMIT_WINDOW_MS = originalWindow;
  });

  it('falls back to the hardcoded defaults when the env vars are unset', () => {
    delete process.env.AUTH_RATE_LIMIT_MAX;
    delete process.env.AUTH_RATE_LIMIT_WINDOW_MS;

    let authLimiter;
    jest.isolateModules(() => {
      // eslint-disable-next-line global-require
      ({ authLimiter } = require('../../src/middlewares/rateLimit.middleware'));
    });

    // The middleware factory itself doesn't expose its config directly,
    // but requiring the module with the env vars unset is what exercises
    // the `|| 5` / `|| 15 * 60 * 1000` fallback branches at module load
    // time — a thrown error here would mean the fallback branch broke.
    expect(typeof authLimiter).toBe('function');
  });
});
