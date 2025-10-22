const mongoose = require('mongoose');

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

    console.log(`🗄️ MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
  } catch (err) {
    console.error(`❌ DB Connection Error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
