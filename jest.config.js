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
  // 30s (up from Jest's 5s default, and up from the previous 15s). This
  // suite runs --runInBand against a single in-memory MongoDB replica
  // set for 20+ minutes; 15s was tight enough that a slow machine under
  // sustained load could spuriously trip it. 30s gives genuine slow
  // tests real headroom without masking a truly hung operation — a
  // 30s hang is still a bug, just a different one.
  testTimeout: 30000,
  clearMocks: true,
  verbose: true,
};
