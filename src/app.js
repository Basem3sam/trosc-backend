const express = require('express');
const swaggerUi = require('swagger-ui-express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const swaggerSpec = require('./config/swagger.config');
const AppError = require('./utils/AppError');
const globalErrorHandler = require('./controllers/error.controller');
const userRouter = require('./routes/user.route');
const trackRouter = require('./routes/track.route');
const sessionRouter = require('./routes/session.route');
const courseRouter = require('./routes/course.route');
const eventRouter = require('./routes/event.route');
const announcementRouter = require('./routes/announcement.route');
const feedRouter = require('./routes/feed.route');

// Initialize Express app
const app = express();

/* GLOBAL MIDDLEWARES */

app.use(cookieParser());

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  /https:\/\/.*\.ngrok-free\.dev/,
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// Enable CORS
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.options('*', cors()); // Handle preflight requests

// Limit request from same IP
const limiter = rateLimit({
  max: parseInt(process.env.RATE_LIMIT_MAX) || 300,
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 Minutes
  message: 'Too many request from this IP, please try again in 15 minutes',
});

app.use(limiter);

// Stricter rate limit for auth endpoints (login, signup, forgotPassword)
const authLimiter = rateLimit({
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5,
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  message:
    'Too many auth attempts from this IP, please try again in 15 minutes',
  skipSuccessfulRequests: true, // Don't count successful logins
});

app.use('/v1/users/login', authLimiter);
app.use('/v1/users/signup', authLimiter);
app.use('/v1/users/forgot-password', authLimiter);
app.use('/v1/users/reset-password', authLimiter);

/* BODY PARSER */

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '100kb' })); //limit the json by 10kb only to prevent attacks with too much data

// Handle form data
app.use(
  express.urlencoded({ extended: true, limit: '1mb', parameterLimit: 5000 }),
);

/* DATA SANITIZATION */

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// prevent parameter pollution (its always use the last one)
// [note:] make sure to focus on what can be arrayed in the params and whitelist it
app.use(
  hpp({
    whitelist: [
      'role',
      'level',
      'prerequisites',
      'students',
      'sessions',
      'locationType',
      'audience',
      // Add any parameters that should allow multiple values
    ],
  }),
);

// Serving static files
// app.use(express.static(`${__dirname}/public`));

//TODO: Mount your routes here
app.use('/v1/users', userRouter);
app.use('/v1/tracks', trackRouter);
app.use('/v1/sessions', sessionRouter);
app.use('/v1/courses', courseRouter);
app.use('/v1/events', eventRouter);
app.use('/v1/announcements', announcementRouter);
app.use('/v1/feed', feedRouter);

// Test route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to the Trosc API 🚀',
    docs: '/api-docs',
  });
});

app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 1 = connected, 2 = connecting, 3 = disconnecting, 0 = disconnected
  if (dbState !== 1) {
    return res.status(503).json({
      status: 'error',
      message: 'Database connection unavailable',
    });
  }
  res.status(200).json({
    status: 'success',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Handle undefined routes
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// GLOBAL ERROR HANDLER
app.use(globalErrorHandler);

module.exports = app;
