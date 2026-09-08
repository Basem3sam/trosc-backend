const request = require('supertest');
const app = require('../src/app');

describe('Feed Endpoint', () => {
  it('GET /v1/feed returns pinned announcements and upcoming events', async () => {
    const res = await request(app).get('/v1/feed');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('announcements');
    expect(res.body.data).toHaveProperty('upcomingEvents');
  });
});
