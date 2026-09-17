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

require('./src/config/loadEnv')();
require('./src/config/env.config')();

const app = require('./src/app');
const connectDB = require('./src/config/db.config');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// T22: register a handler BEFORE connectDB() so a rejection during startup
// (e.g. a config load failure) is caught instead of crashing uncaught.
// This bootstrap handler can't reference `server` yet, so it just logs
// and exits; once `server` exists below we swap in the version that
// closes it gracefully first.
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION during startup! Shutting down...', {
    error: err,
  });
  process.exit(1);
});

// Async startup
(async () => {
  try {
    await connectDB(); // now awaited
    const server = app.listen(PORT, () => {
      logger.info(`Server running in ${NODE_ENV} mode on port ${PORT}`);
    });

    // Now that `server` exists, replace the bootstrap handler with one
    // that shuts it down gracefully.
    process.removeAllListeners('unhandledRejection');
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
