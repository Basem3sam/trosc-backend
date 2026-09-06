const express = require('express');
const swaggerUi = require('swagger-ui-express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
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
const contactRouter = require('./routes/contact.route');
const weeklyTaskProgressRouter = require('./routes/weeklyTaskProgress.route');
const logger = require('./utils/logger');

const { authLimiter } = require('./middlewares/rateLimit.middleware');

const isProduction = process.env.NODE_ENV === 'production';

// Initialize Express app
const app = express();

// Development logging with Morgan
if (!isProduction) {
  app.use(morgan('dev'));
}

// Production logging with Winston
if (isProduction) {
  // Structured request logging
  app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      logger.info({
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${Date.now() - start}ms`,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.user?.id || 'anonymous',
      });
    });

    next();
  });
}

/* GLOBAL MIDDLEWARES */

// Set 'trust proxy' if behind a reverse proxy (e.g., Heroku, Nginx)
if (isProduction) {
  app.set('trust proxy', 1);
}

// Parse cookies
app.use(cookieParser());

// Set security HTTP headers
app.use(helmet());

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
];

// Only add ngrok in development
if (!isProduction) {
  allowedOrigins.push(/https:\/\/.*\.ngrok-free\.dev/);
}

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// Enable CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.some((allowed) =>
          allowed instanceof RegExp ? allowed.test(origin) : allowed === origin,
        )
      ) {
        callback(null, true);
      } else {
        callback(new AppError(`Origin ${origin} not allowed by CORS`, 403));
      }
    },
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
  message: 'Too many requests from this IP, please try again in 15 minutes',
});

app.use(limiter);

// Stricter rate limit for auth endpoints (login, signup, forgotPassword)

app.use('/v1/users/login', authLimiter);
app.use('/v1/users/signup', authLimiter);
app.use('/v1/users/forgotPassword', authLimiter);
app.use('/v1/users/resetPassword', authLimiter);

/* BODY PARSER */

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '100kb' })); //limit the json by 100kb only to prevent attacks with too much data

// Handle form data
app.use(
  express.urlencoded({ extended: true, limit: '1mb', parameterLimit: 5000 }),
);

/* DATA SANITIZATION */

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

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

/* ROUTES */
app.use('/v1/users', userRouter);
app.use('/v1/tracks', trackRouter);
app.use('/v1/sessions', sessionRouter);
app.use('/v1/courses', courseRouter);
app.use('/v1/events', eventRouter);
app.use('/v1/announcements', announcementRouter);
app.use('/v1/feed', feedRouter);
app.use('/v1/contact', contactRouter);
app.use('/v1/weekly-tasks', weeklyTaskProgressRouter);

// Test route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to the Trosc API 🚀',
    docs: '/api-docs',
  });
});

/**
 * @swagger
 * tags:
 *   - name: Health
 *     description: Server health and status checks
 *
 * /health:
 *   get:
 *     security: []
 *     tags: [Health]
 *     operationId: healthCheck
 *     summary: Health check
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 timestamp: { type: string, format: date-time }
 *                 uptime: { type: number }
 *       503:
 *         description: Database connection unavailable
 */

const healthHandler = (req, res) => {
  const dbState = mongoose.connection.readyState;
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
};

// For hosting platforms
app.get('/health', healthHandler);

// For Swagger consistency
app.get('/v1/health', healthHandler);

if (!isProduction) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Handle undefined routes
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// GLOBAL ERROR HANDLER
app.use(globalErrorHandler);

module.exports = app;
