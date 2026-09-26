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
const crypto = require('crypto');

const swaggerSpec = require('./config/swagger.config');
const AppError = require('./utils/AppError');
const globalErrorHandler = require('./controllers/error.controller');
const { logger, asyncLocalStorage } = require('./utils/logger');

const v1Router = require('./routes/v1/index');

const isProduction = process.env.NODE_ENV === 'production';

const app = express();

// ---------------------------------------------------------------------------
//    Request ID + AsyncLocalStorage — MUST be first so every subsequent
//    log line has an ID. Runs before cookieParser, morgan, rate limiter.
// ---------------------------------------------------------------------------
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

app.use((req, res, next) => {
  const incoming = req.headers['x-request-id'];
  // Header can be a string (normal) or an array (client sent it twice).
  // Only accept a string matching a safe charset; otherwise mint a new one.
  const requestId =
    typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming)
      ? incoming
      : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  asyncLocalStorage.run({ requestId }, () => next());
});

// ---------------------------------------------------------------------------
//    HTTP request logging
// ---------------------------------------------------------------------------
if (!isProduction) {
  app.use(morgan('dev'));
} else {
  app.use((req, res, next) => {
    const start = Date.now();
    let logged = false;

    // `close` fires on both normal completion AND client abort. `finish`
    // fires only on completion. Register both and guard with `logged`.
    const logRequest = (aborted) => {
      if (logged) return;
      logged = true;
      logger.info(aborted ? 'Request aborted' : 'Request completed', {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${Date.now() - start}ms`,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        // NOTE: by the time this callback runs, auth middleware has
        // populated req.user. Do NOT move this read to middleware scope —
        // it will always be 'anonymous' there.
        userId: req.user?.id || 'anonymous',
        aborted: aborted || undefined,
      });
    };

    res.on('finish', () => logRequest(false));
    res.on('close', () => logRequest(!res.writableEnded));

    next();
  });
}

// ---------------------------------------------------------------------------
//    Trust proxy — only meaningful behind a reverse proxy (Render, etc.).
//    express-rate-limit@8 requires this to be correct, otherwise it warns
//    that req.ip may not reflect the real client.
// ---------------------------------------------------------------------------
if (isProduction) {
  app.set('trust proxy', 1);
}

// ---------------------------------------------------------------------------
//    Parsers
// ---------------------------------------------------------------------------
app.use(cookieParser());

// ---------------------------------------------------------------------------
//    Security headers (global defaults)
// ---------------------------------------------------------------------------
app.use(helmet());

// ---------------------------------------------------------------------------
//    CORS
// ---------------------------------------------------------------------------
const allowedOrigins = [];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

if (process.env.EXTRA_CORS_ORIGINS) {
  process.env.EXTRA_CORS_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .forEach((o) => allowedOrigins.push(o));
}

if (!isProduction) {
  allowedOrigins.push(
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    /https:\/\/.*\.ngrok-free\.dev/,
  );
}

const corsOptions = {
  origin: (origin, callback) => {
    // No Origin header = non-browser client (curl, mobile app). Allow.
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
  // X-Request-ID must be here so browsers preflight it successfully.
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
};

// `cors(corsOptions)` already responds to preflight OPTIONS requests.
// A separate `app.options('*', ...)` is redundant — and on Express 5 it
// would throw (wildcard syntax changed). Leave it out.
app.use(cors(corsOptions));

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------
// NOTE: express-rate-limit@8 removed the `max` option (deprecated in v7).
// Using `max` here silently falls back to the library default limit (5),
// which is far stricter than intended. Use `limit` instead.
const parsePositiveInt = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const limiter = rateLimit({
  limit: parsePositiveInt(process.env.RATE_LIMIT_MAX, 300),
  windowMs: parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  message: 'Too many requests from this IP, please try again in 15 minutes',
  // Hosts poll /health frequently; Swagger UI loads many assets per view.
  // Neither is real traffic, so don't count them against the limit.
  skip: (req) =>
    req.path === '/health' ||
    req.path === '/v1/health' ||
    req.path.startsWith('/api-docs'),
});

app.use(limiter);

// ---------------------------------------------------------------------------
//    Body parsing
// ---------------------------------------------------------------------------
// 1mb accommodates base64-encoded photo uploads (typically 200-500kb as
// base64, ~33% larger than the binary). Rate limiting is the primary
// defense against abuse of a larger body limit.
app.use(express.json({ limit: '1mb' }));
app.use(
  express.urlencoded({ extended: true, limit: '1mb', parameterLimit: 5000 }),
);

// ---------------------------------------------------------------------------
//    Data sanitization
// ---------------------------------------------------------------------------
// NOTE: express-mongo-sanitize@2.x mutates req.query, which is writable on
// Express 4 but read-only on Express 5. If you upgrade Express, switch to
// @exortek/express-mongo-sanitize (maintained fork with Express 5 support).
app.use(mongoSanitize());

// hpp: "last one wins" for any param NOT in the whitelist. Whitelisted
// params are ones where clients legitimately send an array (e.g. filtering
// by multiple roles). Everything else is collapsed to a single value to
// defend against parameter-pollution attacks.
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
    ],
  }),
);

// ---------------------------------------------------------------------------
//    Routes
// ---------------------------------------------------------------------------
app.use('/v1', v1Router);

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

app.get('/health', healthHandler);
app.get('/v1/health', healthHandler);

// ---------------------------------------------------------------------------
//    Swagger UI
// ---------------------------------------------------------------------------
// helmet runs a second time here on purpose: the global helmet() above sets
// a default CSP that blocks the inline scripts/styles Swagger UI needs.
// This per-route helmet disables CSP only for /api-docs.
// TODO: gate behind an env var or basic auth before this is a concern.
app.use(
  '/api-docs',
  helmet({ contentSecurityPolicy: false }),
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec),
);

// ---------------------------------------------------------------------------
//    404 + global error handler
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
