const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

// Register ONCE at module load. mongoose.connection is a singleton,
// so these fire for every connection (including reconnects).
mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', {
    error: err.message,
    stack: err.stack,
  });
});

mongoose.connection.on('disconnected', () => {
  logger.info('MongoDB disconnected');
});

const connectDB = async () => {
  try {
    // DATABASE_URL is already fully resolved by env.config.js
    // (placeholder substitution + validation happen there). Do not
    // re-substitute here — that was the old duplicate implementation
    // that only ran for the server, not for standalone scripts.
    const DB = process.env.DATABASE_URL;

    if (!DB) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    const conn = await mongoose.connect(DB, {
      maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE, 10) || 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      // Disable autoIndex everywhere. Indexes are managed explicitly
      // via syncIndexes() below (and only when SYNC_INDEXES=true), so
      // we never build indexes implicitly during normal traffic.
      autoIndex: false,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // -------------------------------------------------------------
    // OPTIONAL: sync database indexes
    // -------------------------------------------------------------
    // syncIndexes() DROPS any index not declared in a Mongoose schema,
    // and adds any that are declared but missing. That's the desired
    // behavior when you own every index in the DB — but it is a
    // destructive, slow, network-heavy operation that should NOT run
    // on every boot. In particular:
    //   - It would run on every serverless cold start / container restart.
    //   - If another service writes to the same DB, it will drop that
    //     service's indexes too.
    //   - It adds seconds of latency to startup.
    // Gate it behind an explicit opt-in env flag and skip in tests.
    if (
      process.env.NODE_ENV !== 'test' &&
      process.env.SYNC_INDEXES === 'true'
    ) {
      logger.info('Syncing database indexes...');

      const result = await mongoose.syncIndexes();

      if (result.dropped?.length) {
        logger.warn(`Dropped indexes: ${result.dropped.join(', ')}`);
      }
      if (result.created?.length) {
        logger.info(`Created indexes: ${result.created.join(', ')}`);
      }
      if (!result.dropped?.length && !result.created?.length) {
        logger.info('All indexes are up to date.');
      }

      logger.info('Database indexes sync completed.');
    }
  } catch (err) {
    // M19: intentional fast-fail, no retry loop. In a container/orchestrator
    // deployment (the assumption this project runs under) a transient
    // network blip is expected to be handled by the orchestrator restarting
    // the pod, not by this process looping internally. If you deploy
    // somewhere without that restart behavior, a bounded retry loop here
    // would be the alternative — that's a real behavior change (affects
    // startup semantics under prolonged outages) so it's left as a decision
    // rather than silently added.
    logger.error(`DB Connection Error: ${err.message}`, { stack: err.stack });
    throw err;
  }
};

module.exports = connectDB;
