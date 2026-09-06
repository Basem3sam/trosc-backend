const User = require('../../src/models/user.model');
const generateToken = require('../../src/utils/generateToken');

let counter = 0;

/**
 * Create a real user directly in the test DB (skips the /signup endpoint
 * entirely — no email, no rate limiting, no HTTP round trip) and return
 * both the user document and a valid JWT for it, ready to drop into an
 * Authorization header.
 *
 * @param {Object} overrides - fields to override the defaults with,
 *   e.g. { role: 'instructor' } or { role: 'admin' }
 * @returns {Promise<{ user: Object, token: string }>}
 */
async function createTestUser(overrides = {}) {
  counter += 1;
  const password = overrides.password || 'Password123!';

  const user = await User.create({
    name: overrides.name || `Test User ${counter}`,
    email: overrides.email || `test-user-${counter}@example.com`,
    password,
    passwordConfirm: password,
    role: overrides.role || 'student',
    ...overrides,
  });

  const token = generateToken(user._id);

  return { user, token };
}

module.exports = { createTestUser };
