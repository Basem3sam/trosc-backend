const express = require('express');
const request = require('supertest');
const { createMetrics } = require('../src/config/metrics.config');
const defaultMetrics = require('../src/config/metrics.config');
const app = require('../src/app');
const {
  requestMetrics,
  metricsEndpoint,
  tokenMatches,
} = require('../src/middlewares/metrics.middleware');

const TOKEN = 'a-long-random-test-token-123';

// A small app with the real middleware, nested routers and an error path.
const buildApp = (metrics) => {
  const mini = express();
  mini.use(requestMetrics(metrics));
  mini.get('/metrics', metricsEndpoint(metrics));

  const courses = express.Router();
  courses.get('/:id', (req, res) => res.json({ id: req.params.id }));
  courses.get('/:id/fail', () => {
    throw new Error('boom');
  });
  const v1 = express.Router();
  v1.use('/courses', courses);
  mini.use('/v1', v1);

  // eslint-disable-next-line no-unused-vars
  mini.use((err, req, res, next) => {
    res.status(500).json({ status: 'error' });
  });
  return mini;
};

describe('GET /metrics', () => {
  let metrics;
  let mini;

  beforeEach(() => {
    metrics = createMetrics({ enabled: true });
    mini = buildApp(metrics);
  });

  afterEach(() => {
    metrics.stop();
    delete process.env.METRICS_TOKEN;
  });

  it('is a 404 when METRICS_TOKEN is not set', async () => {
    delete process.env.METRICS_TOKEN;

    const res = await request(mini).get('/metrics');

    expect(res.status).toBe(404);
  });

  it('is a 401 without a token or with a wrong one', async () => {
    process.env.METRICS_TOKEN = TOKEN;

    const none = await request(mini).get('/metrics');
    const wrong = await request(mini)
      .get('/metrics')
      .set('Authorization', 'Bearer not-the-token');
    const wrongScheme = await request(mini)
      .get('/metrics')
      .set('Authorization', TOKEN);

    expect(none.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(wrongScheme.status).toBe(401);
    expect(none.text).not.toContain('http_request_duration_seconds');
  });

  it('is a 200 with the right token and returns Prometheus text', async () => {
    process.env.METRICS_TOKEN = TOKEN;

    const res = await request(mini)
      .get('/metrics')
      .set('Authorization', `Bearer ${TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('# TYPE http_request_duration_seconds');
    expect(res.text).toContain('# TYPE signups_total counter');
    expect(res.text).toContain('# TYPE event_loop_delay_seconds gauge');
  });

  it('compares tokens without throwing on different lengths', () => {
    expect(tokenMatches('short', 'a-much-longer-token-value')).toBe(false);
    expect(tokenMatches(TOKEN, TOKEN)).toBe(true);
  });

  it('is not exposed by the real app under test (metrics are off)', async () => {
    process.env.METRICS_TOKEN = TOKEN;

    const res = await request(app)
      .get('/metrics')
      .set('Authorization', `Bearer ${TOKEN}`);

    expect(res.status).toBe(404);
    expect(defaultMetrics.enabled).toBe(false);
  });
});

describe('label cardinality', () => {
  let metrics;
  let mini;

  const scrape = async () => {
    process.env.METRICS_TOKEN = TOKEN;
    const res = await request(mini)
      .get('/metrics')
      .set('Authorization', `Bearer ${TOKEN}`);
    return res.text;
  };

  beforeEach(() => {
    metrics = createMetrics({ enabled: true });
    mini = buildApp(metrics);
  });

  afterEach(() => {
    metrics.stop();
    delete process.env.METRICS_TOKEN;
  });

  it('labels by route pattern, not by the raw id', async () => {
    await request(mini).get('/v1/courses/111');
    await request(mini).get('/v1/courses/222');
    await request(mini).get('/v1/courses/333');

    const text = await scrape();

    expect(text).toContain('route="/v1/courses/:id"');
    expect(text).not.toContain('111');
    expect(text).not.toContain('222');
    expect(text).toContain('method="GET"');
    expect(text).toContain('status_class="2xx"');
    expect(text).toMatch(
      /http_request_duration_seconds_count\{[^}]*route="\/v1\/courses\/:id"[^}]*\} 3/,
    );
  });

  it('keeps the pattern on an error path and counts the 5xx', async () => {
    await request(mini).get('/v1/courses/999/fail');

    const text = await scrape();

    expect(text).toContain('route="/v1/courses/:id/fail"');
    expect(text).toContain('status_class="5xx"');
    expect(text).toMatch(
      /http_errors_total\{[^}]*route="\/v1\/courses\/:id\/fail"[^}]*\} 1/,
    );
    expect(text).not.toContain('999');
  });

  it('puts every unmatched URL under one label', async () => {
    await request(mini).get('/nope/aaa');
    await request(mini).get('/nope/bbb');

    const text = await scrape();

    expect(text).toContain('route="unmatched"');
    expect(text).not.toContain('aaa');
    expect(text).not.toContain('bbb');
  });

  it('does not record the /metrics scrape itself', async () => {
    const text = await scrape();

    expect(text).not.toContain('route="/metrics"');
  });
});

describe('business counters', () => {
  it('increments counters, with labels where defined', async () => {
    const metrics = createMetrics({ enabled: true });
    metrics.inc('signups');
    metrics.inc('enrollments', { type: 'course' });
    metrics.inc('enrollments', { type: 'course' });
    metrics.inc('emailFailures');
    metrics.inc('rateLimitRejections', { limiter: 'auth' });
    metrics.inc('notACounter');

    const text = await metrics.render();
    metrics.stop();

    expect(text).toMatch(/signups_total 1/);
    expect(text).toMatch(/enrollments_total\{type="course"\} 2/);
    expect(text).toMatch(/email_send_failures_total 1/);
    expect(text).toMatch(/rate_limit_rejections_total\{limiter="auth"\} 1/);
  });

  it('samples the event loop between start() and stop()', async () => {
    const metrics = createMetrics({ enabled: true });
    metrics.start();
    metrics.start(); // a second start is ignored

    const text = await metrics.render();
    metrics.stop();
    metrics.stop(); // a second stop is harmless

    expect(text).toContain('event_loop_delay_seconds{stat="p99"}');
  });

  it('is a complete no-op when disabled', async () => {
    const metrics = createMetrics({ enabled: false });

    expect(() => {
      metrics.inc('signups');
      metrics.start();
      metrics.stop();
    }).not.toThrow();
    expect(metrics.enabled).toBe(false);
    expect(await metrics.render()).toBe('');
  });
});
