const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/user.model');
const { createTestUser } = require('./helpers/testUser');

describe('Bulk User Actions', () => {
  let adminToken, userIds;

  beforeEach(async () => {
    const { token } = await createTestUser({ role: 'admin' });
    adminToken = token;
    // Create two student users for this test
    const users = await Promise.all([
      createTestUser({ role: 'student' }),
      createTestUser({ role: 'student' }),
    ]);
    userIds = users.map((u) => u.user._id);
  });

  it('admin can deactivate multiple users', async () => {
    const res = await request(app)
      .post('/v1/users/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userIds, action: 'deactivate' });
    expect(res.status).toBe(200);
    const deactivated = await User.find({
      _id: { $in: userIds },
      active: false,
    });
    expect(deactivated).toHaveLength(userIds.length);
  });

  it('admin can activate multiple users', async () => {
    // First deactivate them
    await request(app)
      .post('/v1/users/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userIds, action: 'deactivate' });

    const res = await request(app)
      .post('/v1/users/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userIds, action: 'activate' });
    expect(res.status).toBe(200);
    const activated = await User.find({ _id: { $in: userIds }, active: true });
    expect(activated).toHaveLength(userIds.length);
  });

  it('admin can delete multiple users', async () => {
    const res = await request(app)
      .post('/v1/users/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userIds, action: 'delete' });
    expect(res.status).toBe(200);
    const remaining = await User.find({ _id: { $in: userIds } });
    expect(remaining).toHaveLength(0);
  });

  it('prevents admin from targeting themselves', async () => {
    const { user: adminUser, token: newAdminToken } = await createTestUser({
      role: 'admin',
    });
    const res = await request(app)
      .post('/v1/users/bulk')
      .set('Authorization', `Bearer ${newAdminToken}`)
      .send({ userIds: [adminUser._id], action: 'deactivate' });
    expect(res.status).toBe(403);
  });

  it('prevents targeting other admins', async () => {
    const { user: anotherAdmin } = await createTestUser({ role: 'admin' });
    const res = await request(app)
      .post('/v1/users/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userIds: [anotherAdmin._id], action: 'deactivate' });
    expect(res.status).toBe(403);
  });
});
