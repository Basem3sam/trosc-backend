const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/user.model');
const { createTestUser } = require('../helpers/testUser');

describe('protect middleware — cookie-based auth and edge cases', () => {
  it('authenticates via the jwt cookie when no Authorization header is sent', async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .get('/v1/users/me')
      .set('Cookie', [`jwt=${token}`]);

    expect(res.status).toBe(200);
  });

  it('rejects a token whose user has since been deactivated', async () => {
    const { token, user } = await createTestUser();
    await User.findByIdAndUpdate(user._id, { active: false });

    const res = await request(app)
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/User no longer exists/);
  });

  it('rejects a token issued before the password was last changed', async () => {
    const { token, user } = await createTestUser();
    // Force passwordChangedAt to be after the token's issued-at time,
    // without needing to wait out a real clock second boundary.
    await User.findByIdAndUpdate(user._id, {
      passwordChangedAt: new Date(Date.now() + 5000),
    });

    const res = await request(app)
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/recently changed password/);
  });
});

describe('optionalAuth middleware — cookie-based auth', () => {
  it('picks up a valid user from the jwt cookie', async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .get('/v1/announcements')
      .set('Cookie', [`jwt=${token}`]);

    expect(res.status).toBe(200);
  });

  it('falls through as anonymous on an invalid cookie token', async () => {
    const res = await request(app)
      .get('/v1/announcements')
      .set('Cookie', ['jwt=not-a-real-token']);

    expect(res.status).toBe(200);
  });
});
