const request = require('supertest');
const app = require('../../src/app');
const Course = require('../../src/models/course.model');
const { createTestUser } = require('../helpers/testUser');

async function createCourse(instructorToken) {
  const res = await request(app)
    .post('/v1/courses')
    .set('Authorization', `Bearer ${instructorToken}`)
    .send({
      title: 'Gap Coverage Course',
      description: 'Course used for controller gap coverage',
      published: true,
      access: 'public',
    });
  expect(res.status).toBe(201);
  return res.body.data.course._id;
}

describe('Course Controller – list / single / update / leaveMe', () => {
  let instructorToken;

  beforeEach(async () => {
    const inst = await createTestUser({ role: 'instructor' });
    instructorToken = inst.token;
  });

  describe('GET /v1/courses', () => {
    it('returns all courses with pagination info', async () => {
      await createCourse(instructorToken);

      const res = await request(app).get('/v1/courses');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.courses)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /v1/courses/:id', () => {
    it('returns a single course', async () => {
      const courseId = await createCourse(instructorToken);

      const res = await request(app).get(`/v1/courses/${courseId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.course._id).toBe(courseId);
    });
  });

  describe('PATCH /v1/courses/:id', () => {
    it('owner instructor can update their course', async () => {
      const courseId = await createCourse(instructorToken);

      const res = await request(app)
        .patch(`/v1/courses/${courseId}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ title: 'Updated Course Title' });

      expect(res.status).toBe(200);
      expect(res.body.data.course.title).toBe('Updated Course Title');
    });

    it('rejects update from a non-owning instructor', async () => {
      const courseId = await createCourse(instructorToken);
      const { token: otherToken } = await createTestUser({
        role: 'instructor',
      });

      const res = await request(app)
        .patch(`/v1/courses/${courseId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Hijacked Title' });

      expect(res.status).toBe(403);
    });

    it('strips instructor/students/sessions from the update body', async () => {
      const courseId = await createCourse(instructorToken);
      const { user: intruder } = await createTestUser({ role: 'instructor' });

      const res = await request(app)
        .patch(`/v1/courses/${courseId}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Still Mine',
          instructor: intruder._id.toString(),
        });

      expect(res.status).toBe(200);
      const refreshed = await Course.findById(courseId);
      expect(refreshed.instructor.toString()).not.toBe(intruder._id.toString());
    });
  });

  describe('POST/DELETE /v1/courses/:id/enroll-me & leave-me', () => {
    it('lets an enrolled student leave a course', async () => {
      const courseId = await createCourse(instructorToken);
      await Course.findByIdAndUpdate(courseId, { published: true });
      const { token: studentToken } = await createTestUser({
        role: 'student',
      });

      const enrollRes = await request(app)
        .post(`/v1/courses/${courseId}/enroll-me`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(enrollRes.status).toBe(200);

      const leaveRes = await request(app)
        .delete(`/v1/courses/${courseId}/leave-me`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(leaveRes.status).toBe(200);
      expect(leaveRes.body.message).toBe('Left course successfully');
    });

    it('rejects leaving a course the student is not enrolled in', async () => {
      const courseId = await createCourse(instructorToken);
      const { token: outsiderToken } = await createTestUser({
        role: 'student',
      });

      const res = await request(app)
        .delete(`/v1/courses/${courseId}/leave-me`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(400);
    });
  });
});
