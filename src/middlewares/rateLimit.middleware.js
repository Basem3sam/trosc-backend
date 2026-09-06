const rateLimit = require('express-rate-limit');

// Stricter rate limit for auth / enrollment / RSVP endpoints
const authLimiter = rateLimit({
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5,
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  message:
    'Too many auth attempts from this IP, please try again in 15 minutes',
  // skipSuccessfulRequests: true, // Don't count successful requests
});

module.exports = { authLimiter };
