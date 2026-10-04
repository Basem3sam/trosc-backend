const crypto = require('crypto');

const sha256 = (value) =>
  crypto.createHash('sha256').update(String(value)).digest();

// Constant-time comparison. Hashing first gives both sides the same length,
// which timingSafeEqual requires, without leaking the token's length.
const tokenMatches = (provided, expected) =>
  crypto.timingSafeEqual(sha256(provided), sha256(expected));

/**
 * Records one histogram sample per request, labelled with the route PATTERN
 * (`/v1/courses/:id`), never the raw URL, so label cardinality stays bounded.
 */
const requestMetrics = (metrics) => (req, res, next) => {
  if (!metrics.enabled || req.path === '/metrics') return next();

  const start = process.hrtime.bigint();
  let pattern = null;

  // Express fills req.route when a route matches, and the router resets
  // req.baseUrl on the way out (including on errors). Capture the full
  // pattern at the moment req.route is assigned.
  let route;
  Object.defineProperty(req, 'route', {
    configurable: true,
    enumerable: true,
    get: () => route,
    set: (value) => {
      route = value;
      if (value && typeof value.path === 'string') {
        pattern = `${req.baseUrl || ''}${value.path}`;
      }
    },
  });

  res.on('finish', () => {
    const seconds = Number(process.hrtime.bigint() - start) / 1e9;
    metrics.observeRequest({
      method: req.method,
      route: pattern || 'unmatched',
      statusCode: res.statusCode,
      seconds,
    });
  });

  next();
};

/**
 * GET /metrics. 404 unless METRICS_TOKEN is set; then requires
 * `Authorization: Bearer <token>`.
 */
const metricsEndpoint = (metrics) => async (req, res, next) => {
  const expected = process.env.METRICS_TOKEN;
  if (!metrics.enabled || !expected) return next();

  const header = req.headers.authorization || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!provided || !tokenMatches(provided, expected)) {
    res.set('WWW-Authenticate', 'Bearer');
    return res.status(401).json({
      status: 'fail',
      message: 'Unauthorized',
    });
  }

  try {
    res.set('Content-Type', metrics.contentType);
    return res.status(200).send(await metrics.render());
  } catch (err) {
    return next(err);
  }
};

module.exports = { requestMetrics, metricsEndpoint, tokenMatches };
