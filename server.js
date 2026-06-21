const dotenv = require('dotenv');
const logger = require('./src/utils/logger');

// for catching synchronous errors
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', {
    error: err.name,
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

dotenv.config();

require('./src/config/env.config')(); // ✅ Validate env before booting the app

const app = require('./src/app');

require('./src/config/db.config')();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, () => {
  logger.info(`Server running in ${NODE_ENV} mode on port ${PORT}`);
});

// catching asynchronous errors and exit server gradually
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down...', {
    error: err.name,
    message: err.message,
    stack: err.stack,
  });
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM (for clean shutdown on production servers)
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated!');
  });
});
