const request = require('supertest');
const app = require('../src/app');
const { createTestUser } = require('./helpers/testUser');

// BACKEND-REQUESTS-2 #5.1: `active` is select:false on the User schema, so
// it silently disappeared from admin listings and the list could not show
// who is deactivated. getAllUsers/getUserById re-select it explicitly.
describe('Admin user listings include `active` (#5.1)', () => {
  let adminToken;
  let activeUser;
  let deactivatedUser;

  beforeEach(async () => {
    adminToken = (await createTestUser({ role: 'admin' })).token;
    activeUser = (await createTestUser({ role: 'student' })).user;
    deactivatedUser = (await createTestUser({ role: 'student', active: false }))
      .user;
  });

  const list = (query) =>
    request(app)
      .get(`/v1/users${query}`)
      .set('Authorization', `Bearer ${adminToken}`);

  const byId = (users, id) => users.find((u) => u._id === id.toString());

  it('?includeInactive=true returns active AND deactivated users, each with an explicit `active` boolean', async () => {
    const res = await list('?includeInactive=true&limit=100');

    expect(res.status).toBe(200);
    const { users } = res.body.data;
    expect(byId(users, activeUser._id).active).toBe(true);
    expect(byId(users, deactivatedUser._id).active).toBe(false);
    // no user in the list is missing the field
    users.forEach((u) => expect(typeof u.active).toBe('boolean'));
  });

  it('the default list is still active-only, and still shows `active: true`', async () => {
    const res = await list('?limit=100');

    expect(res.status).toBe(200);
    const { users } = res.body.data;
    expect(byId(users, deactivatedUser._id)).toBeUndefined();
    expect(byId(users, activeUser._id).active).toBe(true);
  });

  it('?active=false returns only deactivated users, with `active: false`', async () => {
    const res = await list('?active=false&limit=100');

    expect(res.status).toBe(200);
    const { users } = res.body.data;
    expect(byId(users, deactivatedUser._id).active).toBe(false);
    expect(byId(users, activeUser._id)).toBeUndefined();
    users.forEach((u) => expect(u.active).toBe(false));
  });

  it('still includes `active` when the caller narrows the response with ?fields=', async () => {
    const res = await list('?includeInactive=true&fields=name&limit=100');

    expect(res.status).toBe(200);
    expect(byId(res.body.data.users, deactivatedUser._id).active).toBe(false);
  });

  it('GET /users/:id includes `active` for a deactivated user', async () => {
    const res = await request(app)
      .get(`/v1/users/${deactivatedUser._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.active).toBe(false);
  });

  it('GET /users/:id includes `active: true` for a normal user', async () => {
    const res = await request(app)
      .get(`/v1/users/${activeUser._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.active).toBe(true);
  });

  it('does not expose the list to non-admins', async () => {
    const { token } = await createTestUser({ role: 'instructor' });
    const res = await request(app)
      .get('/v1/users?includeInactive=true')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
