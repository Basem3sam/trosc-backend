const { logger } = require('../utils/logger');

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'FRONTEND_URL',
];

const PLACEHOLDER_RE = /<[A-Z_]+>|your-|example\.com|changeme|placeholder/i;

const validateEnv = () => {
  // Build DATABASE_URL from parts if given as a template.
  if (
    process.env.DATABASE_URL &&
    process.env.DATABASE_USERNAME &&
    process.env.DATABASE_PASSWORD
  ) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
      '<USERNAME>',
      encodeURIComponent(process.env.DATABASE_USERNAME),
    ).replace('<PASSWORD>', encodeURIComponent(process.env.DATABASE_PASSWORD));
  }

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

  // Reject placeholder values in any required var.
  const placeholders = requiredEnvVars.filter((key) =>
    PLACEHOLDER_RE.test(process.env[key]),
  );
  if (placeholders.length > 0) {
    logger.error(
      `Environment variables still contain placeholder values: ${placeholders.join(', ')}`,
    );
    process.exit(1);
  }

  // Basic shape check on DATABASE_URL.
  if (!/^mongodb(\+srv)?:\/\/[^:]+:[^@]+@.+/.test(process.env.DATABASE_URL)) {
    logger.error(
      'DATABASE_URL is not a valid MongoDB connection string (expected mongodb:// or mongodb+srv:// with credentials).',
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

  // METRICS_TOKEN is optional (GET /metrics is a 404 without it). A short
  // token is easy to guess, so say so, without ever printing the value.
  if (process.env.METRICS_TOKEN && process.env.METRICS_TOKEN.length < 16) {
    logger.warn(
      'METRICS_TOKEN is shorter than 16 characters. Use a longer random token.',
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
