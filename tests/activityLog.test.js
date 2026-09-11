const request = require('supertest');
const app = require('../src/app');
const ActivityLog = require('../src/models/activitylog.model');
const { createTestUser } = require('./helpers/testUser');

describe('Activity Log endpoints', () => {
  async function createLog(userId, overrides = {}) {
    return ActivityLog.create({ user: userId, action: 'login', ...overrides });
  }

  // ===================================================================
  // Auth guards — every route requires a token; everything but /me
  // requires admin.
  // ===================================================================
  describe('auth guards', () => {
    it('rejects an unauthenticated request to any route', async () => {
      const endpoints = [
        '/v1/activity-logs',
        '/v1/activity-logs/me',
        '/v1/activity-logs/summary',
        `/v1/activity-logs/user/507f1f77bcf86cd799439099`,
        `/v1/activity-logs/507f1f77bcf86cd799439099`,
      ];
      await Promise.all(
        endpoints.map(async (url) => {
          const res = await request(app).get(url);
          expect(res.status).toBe(401);
        }),
      );
    });

    it('rejects a non-admin from every route except /me', async () => {
      const { token } = await createTestUser({ role: 'student' });
      const endpoints = [
        '/v1/activity-logs',
        '/v1/activity-logs/summary',
        `/v1/activity-logs/user/507f1f77bcf86cd799439099`,
        `/v1/activity-logs/507f1f77bcf86cd799439099`,
      ];
      await Promise.all(
        endpoints.map(async (url) => {
          const res = await request(app)
            .get(url)
            .set('Authorization', `Bearer ${token}`);
          expect(res.status).toBe(403);
        }),
      );
    });

    it('lets a non-admin hit their own /me', async () => {
      const { token } = await createTestUser({ role: 'student' });
      const res = await request(app)
        .get('/v1/activity-logs/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  // ===================================================================
  // GET /activity-logs/me
  // ===================================================================
  describe('GET /v1/activity-logs/me', () => {
    it("returns only the caller's own logs", async () => {
      const { user, token } = await createTestUser({ role: 'student' });
      const { user: other } = await createTestUser({ role: 'student' });
      await createLog(user._id);
      await createLog(user._id, { action: 'updated_profile' });
      await createLog(other._id);

      const res = await request(app)
        .get('/v1/activity-logs/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(2);
      expect(
        res.body.data.activityLogs.every(
          (log) =>
            log.user === String(user._id) || log.user?._id === String(user._id),
        ),
      ).toBe(true);
    });
  });

  // ===================================================================
  // GET /activity-logs (admin listing)
  // ===================================================================
  describe('GET /v1/activity-logs', () => {
    it('lets an admin list all logs across all users', async () => {
      const { token: adminToken } = await createTestUser({ role: 'admin' });
      const { user: student } = await createTestUser({ role: 'student' });
      await createLog(student._id);
      await createLog(student._id, { action: 'signed_up' });

      const res = await request(app)
        .get('/v1/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(2);
    });

    it('supports ?action= filtering', async () => {
      const { token: adminToken } = await createTestUser({ role: 'admin' });
      const { user: student } = await createTestUser({ role: 'student' });
      await createLog(student._id, { action: 'login' });
      await createLog(student._id, { action: 'signed_up' });

      const res = await request(app)
        .get('/v1/activity-logs?action=signed_up')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(1);
      expect(res.body.data.activityLogs[0].action).toBe('signed_up');
    });
  });

  // ===================================================================
  // GET /activity-logs/user/:userId (admin)
  // ===================================================================
  describe('GET /v1/activity-logs/user/:userId', () => {
    it("lets an admin view a specific user's timeline", async () => {
      const { token: adminToken } = await createTestUser({ role: 'admin' });
      const { user: student } = await createTestUser({ role: 'student' });
      const { user: otherStudent } = await createTestUser({ role: 'student' });
      await createLog(student._id);
      await createLog(otherStudent._id);

      const res = await request(app)
        .get(`/v1/activity-logs/user/${student._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(1);
    });

    it('rejects a malformed userId', async () => {
      const { token: adminToken } = await createTestUser({ role: 'admin' });
      const res = await request(app)
        .get('/v1/activity-logs/user/not-an-id')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });
  });

  // ===================================================================
  // GET /activity-logs/:id (admin)
  // ===================================================================
  describe('GET /v1/activity-logs/:id', () => {
    it('lets an admin fetch a single log', async () => {
      const { token: adminToken } = await createTestUser({ role: 'admin' });
      const { user: student } = await createTestUser({ role: 'student' });
      const log = await createLog(student._id);

      const res = await request(app)
        .get(`/v1/activity-logs/${log._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.activityLog._id).toBe(String(log._id));
    });

    it('returns 404 for a non-existent log', async () => {
      const { token: adminToken } = await createTestUser({ role: 'admin' });
      const res = await request(app)
        .get('/v1/activity-logs/507f1f77bcf86cd799439099')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
  });

  // ===================================================================
  // GET /activity-logs/summary (admin)
  // ===================================================================
  describe('GET /v1/activity-logs/summary', () => {
    it('returns totals, a by-action breakdown, and most active users', async () => {
      const { token: adminToken } = await createTestUser({ role: 'admin' });
      const { user: student } = await createTestUser({ role: 'student' });
      await createLog(student._id);
      await createLog(student._id, { action: 'signed_up' });

      const res = await request(app)
        .get('/v1/activity-logs/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalActivities).toBe(2);
      expect(Array.isArray(res.body.data.byAction)).toBe(true);
      expect(Array.isArray(res.body.data.mostActiveUsers)).toBe(true);
    });

    it('rejects an invalid action filter', async () => {
      const { token: adminToken } = await createTestUser({ role: 'admin' });
      const res = await request(app)
        .get('/v1/activity-logs/summary?action=not_a_real_action')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('rejects "to" before "from"', async () => {
      const { token: adminToken } = await createTestUser({ role: 'admin' });
      const res = await request(app)
        .get(
          '/v1/activity-logs/summary?from=2025-06-01T00:00:00.000Z&to=2025-01-01T00:00:00.000Z',
        )
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });
  });

  // ===================================================================
  // DELETE /activity-logs/:id (admin)
  // ===================================================================
  describe('DELETE /v1/activity-logs/:id', () => {
    it('lets an admin delete a single log', async () => {
      const { token: adminToken } = await createTestUser({ role: 'admin' });
      const { user: student } = await createTestUser({ role: 'student' });
      const log = await createLog(student._id);

      const res = await request(app)
        .delete(`/v1/activity-logs/${log._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);
      expect(await ActivityLog.findById(log._id)).toBeNull();
    });

    it('rejects a non-admin', async () => {
      const { token: studentToken } = await createTestUser({ role: 'student' });
      const log = await createLog((await createTestUser({})).user._id);

      const res = await request(app)
        .delete(`/v1/activity-logs/${log._id}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ===================================================================
  // DELETE /activity-logs?olderThanDays= (admin, bulk prune)
  // ===================================================================
  describe('DELETE /v1/activity-logs (prune)', () => {
    it('deletes logs older than the cutoff', async () => {
      const { token: adminToken } = await createTestUser({ role: 'admin' });
      const { user: student } = await createTestUser({ role: 'student' });
      const oldLog = await createLog(student._id);

      // Backdate via the raw collection, NOT via ActivityLog.findByIdAndUpdate:
      // the schema's `timestamps: { createdAt: true }` config makes Mongoose
      // silently ignore any attempt to set createdAt through the model API.
      // The driver-level update has no such guard, which is exactly what a
      // test simulating an old record needs.
      await ActivityLog.collection.updateOne(
        { _id: oldLog._id },
        {
          $set: {
            createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
          },
        },
      );

      const recentLog = await createLog(student._id);

      // Sanity check: verify the backdate actually took effect before
      // asserting on prune behaviour. Without this, if the schema's
      // timestamps config ever changes, the assertion below would fail
      // with a misleading "deletedCount: 0" and no clue why.
      const backdated = await ActivityLog.findById(oldLog._id);
      expect(backdated.createdAt.getTime()).toBeLessThan(
        Date.now() - 300 * 24 * 60 * 60 * 1000,
      );

      const res = await request(app)
        .delete('/v1/activity-logs?olderThanDays=365')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.deletedCount).toBe(1);
      expect(await ActivityLog.findById(oldLog._id)).toBeNull();
      expect(await ActivityLog.findById(recentLog._id)).not.toBeNull();
    });

    it('requires olderThanDays', async () => {
      const { token: adminToken } = await createTestUser({ role: 'admin' });
      const res = await request(app)
        .delete('/v1/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('rejects an olderThanDays below the safety floor', async () => {
      const { token: adminToken } = await createTestUser({ role: 'admin' });
      const res = await request(app)
        .delete('/v1/activity-logs?olderThanDays=1')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });
  });

  // ===================================================================
  // End-to-end: real actions actually produce log entries
  // ===================================================================
  describe('real actions are logged', () => {
    it('logs signup and login', async () => {
      const credentials = {
        name: 'Activity Test',
        email: 'activity-log-e2e@example.com',
        password: 'Password123!',
        passwordConfirm: 'Password123!',
      };

      const signupRes = await request(app)
        .post('/v1/users/signup')
        .send(credentials);
      expect(signupRes.status).toBe(201);
      const { token } = signupRes.body;

      await request(app)
        .post('/v1/users/login')
        .send({ email: credentials.email, password: credentials.password });

      const res = await request(app)
        .get('/v1/activity-logs/me')
        .set('Authorization', `Bearer ${token}`);

      const actions = res.body.data.activityLogs.map((log) => log.action);
      expect(actions).toEqual(expect.arrayContaining(['signed_up', 'login']));
    });

    it('logs a profile update', async () => {
      const { token } = await createTestUser({ role: 'student' });

      await request(app)
        .patch('/v1/users/updateMe')
        .set('Authorization', `Bearer ${token}`)
        .send({ bio: 'Updated bio' });

      const res = await request(app)
        .get('/v1/activity-logs/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.data.activityLogs.map((l) => l.action)).toContain(
        'updated_profile',
      );
    });
  });
});
