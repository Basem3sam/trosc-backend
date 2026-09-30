const request = require('supertest');
const app = require('../src/app');
const Track = require('../src/models/track.model');
const Course = require('../src/models/course.model');
const { createTestUser } = require('./helpers/testUser');

// BACKEND-REQUESTS-2 Q5: "draft listing behavior" — public/unauthorized
// callers see published content only; the authorized owner (and admin)
// also sees their own drafts; nobody sees another instructor's drafts
// just because they're authenticated.
describe('Track/Course list draft visibility (Q5)', () => {
  let owner;
  let ownerToken;
  let otherInstructorToken;
  let studentToken;
  let adminToken;
  let draftTrack;
  let draftCourse;

  beforeEach(async () => {
    const ownerPair = await createTestUser({ role: 'instructor' });
    owner = ownerPair.user;
    ownerToken = ownerPair.token;
    otherInstructorToken = (await createTestUser({ role: 'instructor' })).token;
    studentToken = (await createTestUser({ role: 'student' })).token;
    adminToken = (await createTestUser({ role: 'admin' })).token;

    draftTrack = await Track.create({
      title: '[TEST] Draft Track',
      description: 'Not ready yet',
      instructor: owner._id,
      published: false,
    });

    draftCourse = await Course.create({
      title: 'Draft Course Title',
      description: 'Not ready yet, but long enough to pass validation',
      instructor: owner._id,
      published: false,
    });
  });

  describe('GET /v1/tracks', () => {
    it('excludes the draft for an anonymous caller', async () => {
      const res = await request(app).get('/v1/tracks');
      const ids = res.body.data.tracks.map((t) => t._id);
      expect(ids).not.toContain(draftTrack._id.toString());
    });

    it('excludes the draft for an unrelated authenticated instructor', async () => {
      const res = await request(app)
        .get('/v1/tracks')
        .set('Authorization', `Bearer ${otherInstructorToken}`);
      const ids = res.body.data.tracks.map((t) => t._id);
      expect(ids).not.toContain(draftTrack._id.toString());
    });

    it('excludes the draft for a student', async () => {
      const res = await request(app)
        .get('/v1/tracks')
        .set('Authorization', `Bearer ${studentToken}`);
      const ids = res.body.data.tracks.map((t) => t._id);
      expect(ids).not.toContain(draftTrack._id.toString());
    });

    it('includes the draft for its own instructor', async () => {
      const res = await request(app)
        .get('/v1/tracks')
        .set('Authorization', `Bearer ${ownerToken}`);
      const ids = res.body.data.tracks.map((t) => t._id);
      expect(ids).toContain(draftTrack._id.toString());
    });

    it('includes the draft for an admin', async () => {
      const res = await request(app)
        .get('/v1/tracks')
        .set('Authorization', `Bearer ${adminToken}`);
      const ids = res.body.data.tracks.map((t) => t._id);
      expect(ids).toContain(draftTrack._id.toString());
    });
  });

  describe('GET /v1/courses', () => {
    it('excludes the draft for an anonymous caller', async () => {
      const res = await request(app).get('/v1/courses');
      const ids = res.body.data.courses.map((c) => c._id);
      expect(ids).not.toContain(draftCourse._id.toString());
    });

    it('includes the draft for its own instructor', async () => {
      const res = await request(app)
        .get('/v1/courses')
        .set('Authorization', `Bearer ${ownerToken}`);
      const ids = res.body.data.courses.map((c) => c._id);
      expect(ids).toContain(draftCourse._id.toString());
    });

    it('includes the draft for an admin', async () => {
      const res = await request(app)
        .get('/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`);
      const ids = res.body.data.courses.map((c) => c._id);
      expect(ids).toContain(draftCourse._id.toString());
    });
  });
});
