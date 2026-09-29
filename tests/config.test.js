const request = require('supertest');
const app = require('../src/app');
const trustedHosts = require('../src/utils/trustedHosts');

describe('GET /v1/config/trusted-hosts', () => {
  it('is public — no authentication required', async () => {
    const res = await request(app).get('/v1/config/trusted-hosts');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  it('returns the exact same array every validator checks against', async () => {
    const res = await request(app).get('/v1/config/trusted-hosts');
    expect(res.body.data.trustedHosts).toEqual(trustedHosts);
    expect(res.body.results).toBe(trustedHosts.length);
  });

  it('includes YouTube hosts (#Q8)', async () => {
    const res = await request(app).get('/v1/config/trusted-hosts');
    expect(res.body.data.trustedHosts).toEqual(
      expect.arrayContaining([
        'youtube.com',
        'youtu.be',
        'youtube-nocookie.com',
      ]),
    );
  });
});
