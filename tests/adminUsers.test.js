const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/user.model');
const { createTestUser } = require('./helpers/testUser');

describe('Admin User Management', () => {
  let adminToken;

  beforeEach(async () => {
    const admin = await createTestUser({ role: 'admin' });
    adminToken = admin.token;
  });

  it('GET /v1/users lists all users (admin only)', async () => {
    const res = await request(app)
      .get('/v1/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.results).toBeGreaterThan(0);
  });

  it('POST /v1/users creates a user with specified role', async () => {
    const res = await request(app)
      .post('/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Admin Created',
        email: 'admincreated@example.com',
        password: 'Password123!',
        passwordConfirm: 'Password123!',
        role: 'instructor',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('instructor');
    // No need to store ID – each test is independent
  });

  it('GET /v1/users/:id returns user', async () => {
    // Create a user directly using the helper
    const { user } = await createTestUser({
      email: 'testuser@example.com',
      name: 'Test User',
      role: 'student',
    });
    const userId = user._id;

    const res = await request(app)
      .get(`/v1/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('testuser@example.com');
  });

  it('PATCH /v1/users/:id updates user', async () => {
    const { user } = await createTestUser({
      email: 'testuser@example.com',
      name: 'Test User',
      role: 'student',
    });
    const userId = user._id;

    const res = await request(app)
      .patch(`/v1/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Updated Name');
  });

  it('DELETE /v1/users/:id deletes user', async () => {
    const { user } = await createTestUser({
      email: 'testuser@example.com',
      name: 'Test User',
      role: 'student',
    });
    const userId = user._id;

    const res = await request(app)
      .delete(`/v1/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
    const deletedUser = await User.findById(userId);
    expect(deletedUser).toBeNull();
  });
});
