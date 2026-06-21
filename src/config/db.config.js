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
    // Use consistent environment variable names
    let DB = process.env.DATABASE_URL;

    // Only replace if using placeholder format
    if (DB && DB.includes('<PASSWORD>')) {
      DB = DB.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
    }
    if (DB && DB.includes('<USERNAME>')) {
      DB = DB.replace('<USERNAME>', process.env.DATABASE_USERNAME);
    }

    if (!DB) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    // Connect to MongoDB with better options
    const conn = await mongoose.connect(DB, {
      // Recommended settings
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    logger.error(`DB Connection Error: ${err.message}`, { stack: err.stack });
    process.exit(1);
  }
};

module.exports = connectDB;
