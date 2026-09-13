const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const { AsyncLocalStorage } = require('async_hooks');

// Create a global AsyncLocalStorage instance to store the current request ID
const asyncLocalStorage = new AsyncLocalStorage();

// Custom format to inject the request ID from the ALS into the log metadata
const requestIdFormat = winston.format((info) => {
  const store = asyncLocalStorage.getStore();
  if (store?.requestId) {
    info.requestId = store.requestId;
  } else {
    info.requestId = 'no-request-id';
  }
  return info;
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  // Winston defaults to exitOnError: true — a transport failure (e.g. a
  // full disk on the file transports below) would otherwise kill the
  // whole process. A logging failure shouldn't take the app down with it.
  exitOnError: false,
  format: winston.format.combine(
    requestIdFormat(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        requestIdFormat(),
        winston.format.timestamp(),
        winston.format.printf(
          ({ timestamp, level, message, requestId, ...meta }) =>
            `${timestamp} [${requestId}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`,
        ),
      ),
    }),
  ],
});

if (process.env.NODE_ENV === 'production') {
  logger.add(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.json(), // Keep JSON for production parsing
    }),
  );
  logger.add(
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.json(),
    }),
  );
}

// Export the ALS and the logger together
module.exports = { logger, asyncLocalStorage };
