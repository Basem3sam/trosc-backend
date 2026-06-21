const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'FRONTEND_URL',
];

const validateEnv = () => {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      `❌ Missing required environment variables: ${missing.join(', ')}`,
    );
    console.error(
      'The server cannot start without these. Check your .env file.',
    );
    process.exit(1);
  }

  // Warnings for features that will break silently
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(
      '⚠️  EMAIL_USER or EMAIL_PASS not set. Password reset emails will fail.',
    );
  }
  if (!process.env.EMAIL_HOST && !process.env.EMAIL_SERVICE) {
    console.warn(
      '⚠️  EMAIL_HOST (dev) or EMAIL_SERVICE (prod) not set. Email transport is misconfigured.',
    );
  }
};

module.exports = validateEnv;
