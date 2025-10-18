const express = require('express');
const swaggerUi = require('swagger-ui-express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const swaggerSpec = require('./config/swagger.config');

const AppError = require('./utils/AppError');
const globalErrorHandler = require('./controllers/error.controller');
const userRouter = require('./routes/user.route');

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
    origin: [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.options('*', cors()); // Handle preflight requests

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
app.use(hpp());

// Serving static files
// app.use(express.static(`${__dirname}/public`));

//TODO: Mount your routes here
app.use('/api/v1/users', userRouter);

// Test route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to the Trosc API 🚀',
    docs: '/api-docs',
  });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Handle undefined routes
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// GLOBAL ERROR HANDLER
app.use(globalErrorHandler);

module.exports = app;
