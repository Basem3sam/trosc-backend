const { logger } = require('../utils/logger');

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'FRONTEND_URL',
];

const validateEnv = () => {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
    logger.error(
      'The server cannot start without these. Check your .env file.',
    );
    process.exit(1);
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logger.error('JWT_SECRET must be at least 32 characters long for security');
    process.exit(1);
  }

  // Warnings for features that will break silently
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    logger.warn(
      'EMAIL_USER or EMAIL_PASS not set. Password reset emails will fail.',
    );
  }
  if (!process.env.EMAIL_HOST && !process.env.EMAIL_SERVICE) {
    logger.warn(
      'EMAIL_HOST (dev) or EMAIL_SERVICE (prod) not set. Email transport is misconfigured.',
    );
  }

  // RATE_LIMIT_MAX / AUTH_RATE_LIMIT_MAX have no upper bound elsewhere —
  // .env.test intentionally sets both to 100000 so test suites aren't
  // throttled. If that value (or anything like it) ever ends up in a
  // production .env by copy-paste, rate limiting is effectively
  // disabled with no error, just silently permissive limits. Warn
  // loudly rather than cap it outright, since a legitimately
  // high-traffic deployment might genuinely want a large limit.
  if (process.env.NODE_ENV === 'production') {
    const SANE_RATE_LIMIT_MAX = 10000;
    const SANE_AUTH_RATE_LIMIT_MAX = 1000;
    const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX, 10);
    const authRateLimitMax = parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10);

    if (rateLimitMax > SANE_RATE_LIMIT_MAX) {
      logger.warn(
        `RATE_LIMIT_MAX=${rateLimitMax} is unusually high for production and may leave rate limiting effectively disabled. Verify this wasn't copied from .env.test.`,
      );
    }
    if (authRateLimitMax > SANE_AUTH_RATE_LIMIT_MAX) {
      logger.warn(
        `AUTH_RATE_LIMIT_MAX=${authRateLimitMax} is unusually high for production auth endpoints. Verify this wasn't copied from .env.test.`,
      );
    }
  }
};

module.exports = validateEnv;
