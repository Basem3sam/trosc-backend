const jwt = require('jsonwebtoken');

// `expiresIn` defaults to the project's normal JWT lifetime, but callers
// (e.g. login's `rememberMe` handling) can override it per-token without
// touching the default used everywhere else (signup, password reset, etc.).
module.exports = (id, expiresIn = process.env.JWT_EXPIRES_IN) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn,
  });
