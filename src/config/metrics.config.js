const { monitorEventLoopDelay } = require('perf_hooks');

const NS_PER_SECOND = 1e9;

const noop = () => {};

// Returned when metrics are switched off (always the case under Jest), so
// call sites never need an `if (enabled)` of their own.
const createDisabled = () => ({
  enabled: false,
  inc: noop,
  observeRequest: noop,
  start: noop,
  stop: noop,
  render: async () => '',
  contentType: 'text/plain; charset=utf-8',
});

/**
 * Builds a metrics instance with its own registry. `enabled: false` returns
 * a no-op object with the same shape.
 */
const createMetrics = ({ enabled = true } = {}) => {
  if (!enabled) return createDisabled();

  // Loaded only when metrics are on, so the disabled path (tests) has no
  // dependency on the package.
  // eslint-disable-next-line global-require
  const client = require('prom-client');

  const registry = new client.Registry();
  let loopHistogram = null;

  const httpDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration by method, route pattern and status class',
    labelNames: ['method', 'route', 'status_class'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry],
  });

  const httpErrors = new client.Counter({
    name: 'http_errors_total',
    help: 'HTTP responses with a 5xx status',
    labelNames: ['method', 'route'],
    registers: [registry],
  });

  const counters = {
    signups: new client.Counter({
      name: 'signups_total',
      help: 'Successful sign-ups',
      registers: [registry],
    }),
    enrollments: new client.Counter({
      name: 'enrollments_total',
      help: 'Successful enrollments by type (track, course, session)',
      labelNames: ['type'],
      registers: [registry],
    }),
    emailFailures: new client.Counter({
      name: 'email_send_failures_total',
      help: 'Emails that failed to send',
      registers: [registry],
    }),
    rateLimitRejections: new client.Counter({
      name: 'rate_limit_rejections_total',
      help: 'Requests rejected by a rate limiter',
      labelNames: ['limiter'],
      registers: [registry],
    }),
  };

  // Computed at scrape time from the sampled histogram. Seconds.
  // eslint-disable-next-line no-new
  new client.Gauge({
    name: 'event_loop_delay_seconds',
    help: 'Event loop delay since the last scrape (mean, p99, max)',
    labelNames: ['stat'],
    registers: [registry],
    collect() {
      if (!loopHistogram) return;
      this.set({ stat: 'mean' }, (loopHistogram.mean || 0) / NS_PER_SECOND);
      this.set({ stat: 'p99' }, loopHistogram.percentile(99) / NS_PER_SECOND);
      this.set({ stat: 'max' }, loopHistogram.max / NS_PER_SECOND);
      loopHistogram.reset();
    },
  });

  return {
    enabled: true,
    registry,
    contentType: registry.contentType,

    // metrics.inc('enrollments', { type: 'track' })
    inc(name, labels) {
      const counter = counters[name];
      if (!counter) return;
      if (labels) counter.inc(labels);
      else counter.inc();
    },

    observeRequest({ method, route, statusCode, seconds }) {
      const statusClass = `${Math.floor(statusCode / 100)}xx`;
      httpDuration.observe(
        { method, route, status_class: statusClass },
        seconds,
      );
      if (statusCode >= 500) httpErrors.inc({ method, route });
    },

    start() {
      if (loopHistogram) return;
      loopHistogram = monitorEventLoopDelay({ resolution: 20 });
      loopHistogram.enable();
    },

    // Called on graceful shutdown. Stops the sampling timer.
    stop() {
      if (!loopHistogram) return;
      loopHistogram.disable();
      loopHistogram = null;
    },

    render: () => registry.metrics(),
  };
};

// Metrics are off under Jest; tests build their own instance when needed.
const metrics = createMetrics({ enabled: process.env.NODE_ENV !== 'test' });

module.exports = metrics;
module.exports.createMetrics = createMetrics;
