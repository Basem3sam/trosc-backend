const request = require('supertest');
const app = require('../src/app');
const Contact = require('../src/models/contact.model');
const { createTestUser } = require('./helpers/testUser');

describe('Contact admin endpoints', () => {
  async function createSubmission(overrides = {}) {
    return Contact.create({
      username: 'Basem Esam',
      track: 'Backend Development',
      email: `submission-${Date.now()}-${Math.random()}@example.com`,
      phone: '+201234567890',
      message: 'I would like to know more about the upcoming cohort.',
      ...overrides,
    });
  }

  describe('GET /v1/contact', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await request(app).get('/v1/contact');
      expect(res.status).toBe(401);
    });

    it('rejects a non-admin', async () => {
      const { token: studentToken } = await createTestUser({ role: 'student' });
      const res = await request(app)
        .get('/v1/contact')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });

    it('lets an admin list all submissions', async () => {
      const { token: adminToken } = await createTestUser({ role: 'admin' });
      await createSubmission();
      await createSubmission();

      const res = await request(app)
        .get('/v1/contact')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(2);
    });
  });

  describe('GET /v1/contact/:id', () => {
    it('lets an admin fetch a single submission', async () => {
      const { token: adminToken } = await createTestUser({ role: 'admin' });
      const submission = await createSubmission();

      const res = await request(app)
        .get(`/v1/contact/${submission._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.contact._id).toBe(String(submission._id));
    });

    it('returns 404 for a non-existent submission', async () => {
      const { token: adminToken } = await createTestUser({ role: 'admin' });
      const fakeId = '507f1f77bcf86cd799439099';

      const res = await request(app)
        .get(`/v1/contact/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /v1/contact/:id', () => {
    it("lets an admin update a submission's status", async () => {
      const { token: adminToken } = await createTestUser({ role: 'admin' });
      const submission = await createSubmission();

      const res = await request(app)
        .patch(`/v1/contact/${submission._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'read' });

      expect(res.status).toBe(200);
      expect(res.body.data.contact.status).toBe('read');
    });

    it('rejects an invalid status value', async () => {
      const { token: adminToken } = await createTestUser({ role: 'admin' });
      const submission = await createSubmission();

      const res = await request(app)
        .patch(`/v1/contact/${submission._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'not-a-real-status' });

      expect(res.status).toBe(400);
    });

    it('rejects a non-admin', async () => {
      const { token: studentToken } = await createTestUser({ role: 'student' });
      const submission = await createSubmission();

      const res = await request(app)
        .patch(`/v1/contact/${submission._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ status: 'archived' });

      expect(res.status).toBe(403);
    });
  });
});
