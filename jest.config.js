module.exports = {
  testEnvironment: 'node',
  // Load env vars + connect to the in-memory DB before any test file runs,
  // and tear it down after the whole suite finishes.
  globalSetup: './tests/globalSetup.js',
  globalTeardown: './tests/globalTeardown.js',
  // Runs inside each test file's environment (has access to expect, etc.)
  // — used to open/close the DB connection per file and reset collections
  // between individual tests.
  setupFilesAfterEnv: ['./tests/setupAfterEnv.js'],
  testMatch: ['**/tests/**/*.test.js'],
  // Give slow DB-backed tests a bit more room than Jest's 5s default.
  testTimeout: 15000,
  clearMocks: true,
  verbose: true,
};
