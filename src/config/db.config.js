const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Build DB connection string
    const DB = process.env.MONGO_URI.replace(
      '<USERNAME>',
      process.env.DATABASE_USERNAME,
    ).replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

    // Connect to MongoDB
    const conn = await mongoose.connect(DB);

    console.log(`🗄️ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ DB Connection Error: ${err.message}`);
    process.exit(1); // stop app if DB connection fails
  }
};

module.exports = connectDB;
