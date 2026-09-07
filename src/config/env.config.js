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
};

module.exports = validateEnv;
