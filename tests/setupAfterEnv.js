const mongoose = require('mongoose');

jest.mock('../src/utils/Email');

// Each test FILE gets its own Mongoose connection to the shared in-memory
// MongoDB instance (started once in globalSetup.js). Collections are wiped
// between individual tests so no test can see another test's data.
//
// Connection options are deliberately looser than the driver defaults:
// this suite runs --runInBand for 20+ minutes against a single in-memory
// replica set, and the default server-selection timeout (30s) combined
// with an aggressive pool heartbeat is enough to turn a transient
// "monitor failed to ping once" into a full-suite failure. The values
// below give the driver room to recover from a single missed heartbeat
// instead of tearing down every in-flight operation.

beforeAll(async () => {
  await mongoose.connect(process.env.DATABASE_URL, {
    // How long an operation waits for a "suitable" server to appear in
    // the topology before giving up. Raised from the 30s default so a
    // brief monitor hiccup has time to self-heal.
    serverSelectionTimeoutMS: 60000,

    // How long a single socket read/write can be idle before erroring.
    // In-memory Mongo on localhost is fast; this is only here to make a
    // genuinely hung operation fail eventually instead of blocking
    // forever.
    socketTimeoutMS: 120000,

    // Pool monitor ping interval. The default (10s) is chatty for a
    // localhost server that's rarely going to be unavailable; 30s keeps
    // the monitor from being a source of noise under sustained load.
    heartbeatFrequencyMS: 30000,

    // Retry writes/reads once on a transient network error rather than
    // surfacing it to the caller. For a localhost in-memory server,
    // a retry almost always succeeds.
    retryWrites: true,
    retryReads: true,
  });
});

afterEach(async () => {
  // If the DB died mid-file (see the flaky-run failure mode in
  // activityLog.test.js), skip cleanup. The driver would otherwise
  // spend socketTimeoutMS per collection before rejecting, and there
  // are ~11 collections — turning one dead connection into a 5+ minute
  // tail of hangs. The next test will fail fast on its own with a
  // clearer error.
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
});

afterAll(async () => {
  // close() is safe on an already-dead connection — it resolves
  // immediately if the underlying client is gone.
  await mongoose.connection.close();
});
