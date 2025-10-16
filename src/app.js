const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');

const AppError = require('./utils/AppError');
const globalErrorHandler = require('./controllers/errorController');

// Initialize Express app
const app = express();

/* GLOBAL MIDDLEWARES */

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Enable CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  }),
);

// Limit request from same IP
const limiter = rateLimit({
  max: process.env.RATE_LIMIT_MAX || 100,
  windowMs: process.env.RATE_LIMIT_WINDOWS_MS || 60 * 60 * 10000, // 1 hour
  message: 'Too many request from this IP, please try again in an hour',
});

app.use(limiter);

/* BODY PARSER */

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' })); //limit the json by 10kb only to prevent attacks with too much data

// Handle form data
app.use(express.urlencoded({ extended: true }));

/* DATA SANITIZATION */

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// prevent parameter pollution (its always use the last one)
// [note:] make sure to focus on what can be arrayed in the params and whitelist it
app.use(hpp());

// Serving static files
// app.use(express.static(`${__dirname}/public`));

//TODO: Mount your routes here

// Handle undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// GLOBAL ERROR HANDLER
app.use(globalErrorHandler);

module.exports = app;
