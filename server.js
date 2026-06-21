const dotenv = require('dotenv');

// for catching synchronous errors
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config();

require('./src/config/env.config')(); // ✅ Validate env before booting the app

const app = require('./src/app');

require('./src/config/db.config')();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, () => {
  console.log(`✅ Server running in ${NODE_ENV} mode on port ${PORT}`);
});

// catching asynchronous errors and exit server gradually
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM (for clean shutdown on production servers)
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('💫 Process terminated!');
  });
});
