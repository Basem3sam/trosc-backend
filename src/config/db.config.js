const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ✅ Register ONCE at module load. mongoose.connection is a singleton,
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
    let DB = process.env.DATABASE_URL;

    if (DB && DB.includes('<PASSWORD>')) {
      DB = DB.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
    }
    if (DB && DB.includes('<USERNAME>')) {
      DB = DB.replace('<USERNAME>', process.env.DATABASE_USERNAME);
    }

    if (!DB) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    // Connect to MongoDB with explicit autoIndex control
    const conn = await mongoose.connect(DB, {
      maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE, 10) || 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      // Disable autoIndex in all environments to avoid
      // unpredictable index builds during runtime operations.
      // We'll manage indexes explicitly via syncIndexes() below.
      autoIndex: false,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // -------------------------------------------------------------
    // 🚀 SYNC DATABASE INDEXES
    // -------------------------------------------------------------
    // Ensures all indexes defined in your Mongoose schemas exist
    // in the actual MongoDB collection.
    //
    // WARNING: This will DROP any indexes that exist in the database
    // but are NOT defined in your schemas. Only use this if you
    // manage all indexes via Mongoose schemas (which this project does).
    //
    // To skip syncing in development (faster startup), you can wrap
    // this in an environment check:
    // if (process.env.NODE_ENV !== 'test') { ... }
    // -------------------------------------------------------------
    logger.info('Syncing database indexes...');

    // syncIndexes() returns a list of actions taken:
    // { dropped: ['index1'], created: ['index2'] }
    const result = await mongoose.syncIndexes();

    if (result.dropped && result.dropped.length > 0) {
      logger.warn(`Dropped indexes: ${result.dropped.join(', ')}`);
    }
    if (result.created && result.created.length > 0) {
      logger.info(`Created indexes: ${result.created.join(', ')}`);
    }
    if (!result.dropped?.length && !result.created?.length) {
      logger.info('All indexes are up to date.');
    }

    logger.info('Database indexes sync completed.');
  } catch (err) {
    logger.error(`DB Connection Error: ${err.message}`, { stack: err.stack });
    process.exit(1);
  }
};

module.exports = connectDB;
