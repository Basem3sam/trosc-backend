const { logger } = require('./src/utils/logger');

// ---------------------------------------------------------------------------
// Synchronous errors — cannot be recovered from safely.
// ---------------------------------------------------------------------------
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', {
    error: err.name,
    message: err.message,
    stack: err.stack,
  });
  // Give the async logger one tick to flush, then hard-exit. We do NOT try
  // to close the HTTP server or the DB here — after an uncaught exception,
  // in-memory state is undefined and further async work is unreliable.
  setImmediate(() => process.exit(1));
});

// ---------------------------------------------------------------------------
// Load environment. Must run before anything reads process.env.
// ---------------------------------------------------------------------------
require('./src/config/loadEnv')();
require('./src/config/env.config')();

const mongoose = require('mongoose');
const app = require('./src/app');
const connectDB = require('./src/config/db.config');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ---------------------------------------------------------------------------
// Bootstrap rejection handler. Registered BEFORE connectDB() so a rejection
// during startup is logged rather than crashing uncaught. There is no
// server to close yet, so it just logs and exits.
// ---------------------------------------------------------------------------
const bootstrapRejectionHandler = (err) => {
  logger.error('UNHANDLED REJECTION during startup! Shutting down...', {
    error: err && err.message ? err.message : err,
    stack: err && err.stack,
  });
  process.exit(1);
};
process.on('unhandledRejection', bootstrapRejectionHandler);

// ---------------------------------------------------------------------------
// Graceful shutdown helper — shared by SIGTERM, SIGINT, and post-start
// unhandled rejections.
// ---------------------------------------------------------------------------
let shuttingDown = false;
const shutdown = async (server, reason, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`Shutting down (${reason})...`);

  // Hard-exit safety net: if graceful shutdown hangs (open keep-alive
  // connections, stuck DB call), don't leave the process around forever.
  const FORCE_EXIT_MS = 10_000;
  const forceExit = setTimeout(() => {
    logger.error(
      `Graceful shutdown timed out after ${FORCE_EXIT_MS}ms — forcing exit.`,
    );
    process.exit(1);
  }, FORCE_EXIT_MS);
  forceExit.unref(); // don't keep the event loop alive just for the timer

  try {
    await new Promise((resolve) => server.close(resolve));
    logger.info('HTTP server closed.');

    await mongoose.disconnect();
    logger.info('MongoDB connection closed.');

    clearTimeout(forceExit);
    process.exit(exitCode);
  } catch (err) {
    logger.error('Error during shutdown:', {
      error: err.message,
      stack: err.stack,
    });
    clearTimeout(forceExit);
    process.exit(1);
  }
};

// Async startup
(async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      logger.info(`Server running in ${NODE_ENV} mode on port ${PORT}`);
    });

    // Swap the bootstrap rejection handler for one that shuts the server
    // down gracefully. Remove only OUR handler — not every listener — so we
    // don't clobber handlers registered by libraries (Jest, OpenTelemetry).
    process.removeListener('unhandledRejection', bootstrapRejectionHandler);
    process.on('unhandledRejection', (err) => {
      logger.error('UNHANDLED REJECTION! Shutting down...', {
        error: err && err.message ? err.message : err,
        stack: err && err.stack,
      });
      shutdown(server, 'unhandledRejection', 1);
    });

    process.on('SIGTERM', () => shutdown(server, 'SIGTERM', 0));
    process.on('SIGINT', () => shutdown(server, 'SIGINT', 0)); // Ctrl+C in dev
  } catch (err) {
    logger.error('Failed to start server:', {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  }
})();
