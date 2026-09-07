const request = require('supertest');
const app = require('../src/app');
const {
  buildTrackAndCourseFixture,
  buildStandaloneSessionFixture,
} = require('./helpers/fixtures');
const { createTestUser } = require('./helpers/testUser');

describe('Reviews', () => {
  describe('POST /v1/courses/:id/reviews', () => {
    it('lets an enrolled student review a course', async () => {
      const { course, studentToken } = await buildTrackAndCourseFixture();

      const res = await request(app)
        .post(`/v1/courses/${course._id}/reviews`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ rating: 5, content: 'Really solid course.' });

      expect(res.status).toBe(201);
      expect(res.body.data.review.rating).toBe(5);
      expect(res.body.data.review.course).toBe(String(course._id));
    });

    it('rejects a student who is not enrolled', async () => {
      const { course } = await buildTrackAndCourseFixture();
      const { token: outsiderToken } = await createTestUser({ role: 'student' });

      const res = await request(app)
        .post(`/v1/courses/${course._id}/reviews`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ rating: 4, content: 'Looks interesting.' });

      expect(res.status).toBe(403);
    });

    it('rejects a second review from the same student', async () => {
      const { course, studentToken } = await buildTrackAndCourseFixture();
      const body = { rating: 3, content: 'Decent so far.' };

      await request(app)
        .post(`/v1/courses/${course._id}/reviews`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(body);

      const res = await request(app)
        .post(`/v1/courses/${course._id}/reviews`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(body);

      expect(res.status).toBe(400);
    });

    it('rejects a rating outside 1-5', async () => {
      const { course, studentToken } = await buildTrackAndCourseFixture();

      const res = await request(app)
        .post(`/v1/courses/${course._id}/reviews`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ rating: 7, content: 'Too high a rating.' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /v1/courses/:id/reviews', () => {
    it('is public — no auth required', async () => {
      const { course, studentToken } = await buildTrackAndCourseFixture();

      await request(app)
        .post(`/v1/courses/${course._id}/reviews`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ rating: 5, content: 'Loved it.' });

      const res = await request(app).get(`/v1/courses/${course._id}/reviews`);

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(1);
      expect(res.body.data.reviews[0].rating).toBe(5);
    });
  });

  describe('Session-level reviews', () => {
    it('lets an enrolled student review a standalone session', async () => {
      const { session, studentToken } = await buildStandaloneSessionFixture();

      const res = await request(app)
        .post(`/v1/sessions/${session._id}/reviews`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ rating: 4, content: 'Good session.' });

      expect(res.status).toBe(201);
      expect(res.body.data.review.session).toBe(String(session._id));
    });
  });
});
