const mongoose = require('mongoose');

const db = process.env.DATABASE.replace(
  '<USERNAME>:<PASSWORD>',
  `${process.env.DATABASE_USERNAME}:${process.env.DATABASE_PASSWORD}`,
);

const connectDB = catchAsync(async () => {
  try {
    const conn = await mongoose.connect(db);
    console.log(`🗄️ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ DB Connection Error: ${error.message}`);
    process.exit(1);
  }
});

module.exports = connectDB;
