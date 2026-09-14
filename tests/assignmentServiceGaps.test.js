const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Assignment = require('../src/models/assignment.model');
const { createTestUser } = require('./helpers/testUser');
const { buildTrackAndCourseFixture } = require('./helpers/fixtures');

describe('Assignment service — 404s for missing parent/target resources', () => {
  it('GET /v1/courses/:id/assignments 404s for a non-existent course', async () => {
    const { token } = await createTestUser({ role: 'student' });
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .get(`/v1/courses/${fakeId}/assignments`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('GET /v1/tracks/:id/assignments 404s for a non-existent track', async () => {
    const { token } = await createTestUser({ role: 'student' });
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .get(`/v1/tracks/${fakeId}/assignments`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('POST /v1/courses/:id/assignments 404s for a non-existent course (admin bypasses ownership check)', async () => {
    const { token: adminToken } = await createTestUser({ role: 'admin' });
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post(`/v1/courses/${fakeId}/assignments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Ghost Assignment',
        description: 'Should never be created',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

    expect(res.status).toBe(404);
  });

  it('PATCH /v1/assignments/:id 404s for a non-existent assignment (admin bypasses ownership check)', async () => {
    const { token: adminToken } = await createTestUser({ role: 'admin' });
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .patch(`/v1/assignments/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Ghost Update' });

    expect(res.status).toBe(404);
  });

  it('DELETE /v1/assignments/:id 404s for a non-existent assignment (admin bypasses ownership check)', async () => {
    const { token: adminToken } = await createTestUser({ role: 'admin' });
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .delete(`/v1/assignments/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('sanity check: the fixture-based happy path still creates a real assignment', async () => {
    const { course, instructor } = await buildTrackAndCourseFixture();
    const assignment = await Assignment.create({
      title: 'Sanity Check',
      description: 'Confirms fixtures still work alongside the 404 tests',
      instructor: instructor._id,
      course: course._id,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    expect(assignment._id).toBeDefined();
  });
});
