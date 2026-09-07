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
      const { token: outsiderToken } = await createTestUser({
        role: 'student',
      });

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

  describe('DELETE /v1/courses/:id/reviews/:reviewId', () => {
    it('lets the review author delete their own review', async () => {
      const { course, studentToken } = await buildTrackAndCourseFixture();

      const createRes = await request(app)
        .post(`/v1/courses/${course._id}/reviews`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ rating: 4, content: 'Pretty good.' });

      const reviewId = createRes.body.data.review._id;

      const res = await request(app)
        .delete(`/v1/courses/${course._id}/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(204);

      const listRes = await request(app).get(
        `/v1/courses/${course._id}/reviews`,
      );
      expect(listRes.body.results).toBe(0);
    });

    it("lets an admin delete someone else's review", async () => {
      const { course, studentToken } = await buildTrackAndCourseFixture();
      const { token: adminToken } = await createTestUser({ role: 'admin' });

      const createRes = await request(app)
        .post(`/v1/courses/${course._id}/reviews`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ rating: 4, content: 'Pretty good.' });

      const reviewId = createRes.body.data.review._id;

      const res = await request(app)
        .delete(`/v1/courses/${course._id}/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);
    });

    it("rejects deleting someone else's review", async () => {
      const { course, studentToken } = await buildTrackAndCourseFixture();
      const { token: outsiderToken } = await createTestUser({
        role: 'student',
      });

      const createRes = await request(app)
        .post(`/v1/courses/${course._id}/reviews`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ rating: 4, content: 'Pretty good.' });

      const reviewId = createRes.body.data.review._id;

      const res = await request(app)
        .delete(`/v1/courses/${course._id}/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 for a non-existent review', async () => {
      const { course, studentToken } = await buildTrackAndCourseFixture();
      const fakeId = '507f1f77bcf86cd799439099';

      const res = await request(app)
        .delete(`/v1/courses/${course._id}/reviews/${fakeId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
    });
  });
});
