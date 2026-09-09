const dotenv = require('dotenv');
const { logger } = require('./src/utils/logger');

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
require('./src/config/env.config')();

const app = require('./src/app');
const connectDB = require('./src/config/db.config');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Async startup
(async () => {
  try {
    await connectDB(); // now awaited
    const server = app.listen(PORT, () => {
      logger.info(`Server running in ${NODE_ENV} mode on port ${PORT}`);
    });

    // Move unhandled rejection and SIGTERM handlers here (they need `server`)
    process.on('unhandledRejection', (err) => {
      logger.error('UNHANDLED REJECTION! Shutting down...', { error: err });
      server.close(() => process.exit(1));
    });

    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      server.close(() => logger.info('Process terminated!'));
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
})();
