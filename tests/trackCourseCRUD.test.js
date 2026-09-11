const request = require('supertest');
const app = require('../src/app');
const { createTestUser } = require('./helpers/testUser');

describe('Track & Course CRUD', () => {
  describe('Tracks', () => {
    let instructorToken;
    let adminToken;
    let trackId;

    beforeEach(async () => {
      const { token: instToken } = await createTestUser({ role: 'instructor' });
      instructorToken = instToken;
      const { token: admToken } = await createTestUser({ role: 'admin' });
      adminToken = admToken;
    });

    it('instructor can create a track', async () => {
      const res = await request(app)
        .post('/v1/tracks')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Test Track',
          description: 'A track for testing',
          level: 'beginner',
          published: true,
        });
      expect(res.status).toBe(201);
      trackId = res.body.data.track._id;
    });

    it('instructor can fetch their own track (published)', async () => {
      // First create a track for this test
      const createRes = await request(app)
        .post('/v1/tracks')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Test Track',
          description: 'A track for testing',
          level: 'beginner',
          published: true,
        });
      expect(createRes.status).toBe(201);
      const trackId = createRes.body.data.track._id;

      const res = await request(app)
        .get(`/v1/tracks/${trackId}`)
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.track.title).toBe('Test Track');
    });

    it('instructor can update their own track', async () => {
      const createRes = await request(app)
        .post('/v1/tracks')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Test Track',
          description: 'A track for testing',
          level: 'beginner',
          published: true,
        });
      expect(createRes.status).toBe(201);
      const trackId = createRes.body.data.track._id;

      const res = await request(app)
        .patch(`/v1/tracks/${trackId}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ title: 'Updated Track' });
      expect(res.status).toBe(200);
      expect(res.body.data.track.title).toBe('Updated Track');
    });

    it('admin can delete any track', async () => {
      const createRes = await request(app)
        .post('/v1/tracks')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Test Track',
          description: 'A track for testing',
          level: 'beginner',
          published: true,
        });
      expect(createRes.status).toBe(201);
      const trackId = createRes.body.data.track._id;

      const res = await request(app)
        .delete(`/v1/tracks/${trackId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(204);
    });
  });

  describe('Courses', () => {
    let instructorToken;
    let courseId;

    beforeEach(async () => {
      const { token: instToken } = await createTestUser({ role: 'instructor' });
      instructorToken = instToken;
    });

    it('instructor can create a course', async () => {
      const res = await request(app)
        .post('/v1/courses')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Test Course',
          description: 'A course for testing',
          level: 'intermediate',
          published: true,
        });
      expect(res.status).toBe(201);
      courseId = res.body.data.course._id;
    });

    it('instructor can add a session to their course', async () => {
      // Create a course
      const courseRes = await request(app)
        .post('/v1/courses')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Test Course',
          description: 'A course for testing',
          level: 'intermediate',
          published: true,
        });
      expect(courseRes.status).toBe(201);
      const courseId = courseRes.body.data.course._id;

      // Create a session
      const sessionRes = await request(app)
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Test Session',
          published: true,
        });
      expect(sessionRes.status).toBe(201);
      const sessionId = sessionRes.body.data.session._id;

      const res = await request(app)
        .patch(`/v1/courses/${courseId}/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.course.sessions).toContain(sessionId);
    });

    it('instructor can add and remove a student from their course', async () => {
      // Regression test: DELETE /courses/:id/students/:studentId stacks two
      // partial param validators (getCourseSchema then studentIdSchema) on
      // the same req.params, mirroring the track approve/reject bug.
      const courseRes = await request(app)
        .post('/v1/courses')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Test Course',
          description: 'A course for testing',
          level: 'intermediate',
          published: true,
        });
      expect(courseRes.status).toBe(201);
      const courseId = courseRes.body.data.course._id;

      const { user: student } = await createTestUser({ role: 'student' });
      const studentId = student._id.toString();

      const addRes = await request(app)
        .post(`/v1/courses/${courseId}/students`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ studentId });
      expect(addRes.status).toBe(200);
      expect(addRes.body.data.course.students).toContain(studentId);

      const removeRes = await request(app)
        .delete(`/v1/courses/${courseId}/students/${studentId}`)
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(removeRes.status).toBe(200);
      expect(removeRes.body.data.course.students).not.toContain(studentId);
    });

    it('instructor can delete their own course', async () => {
      const courseRes = await request(app)
        .post('/v1/courses')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Test Course',
          description: 'A course for testing',
          level: 'intermediate',
          published: true,
        });
      expect(courseRes.status).toBe(201);
      const courseId = courseRes.body.data.course._id;

      const res = await request(app)
        .delete(`/v1/courses/${courseId}`)
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(res.status).toBe(204);
    });
  });
});
