const request = require('supertest');
const Track = require('../src/models/track.model');
const Course = require('../src/models/course.model');
const User = require('../src/models/user.model');
const app = require('../src/app');
const { createTestUser } = require('./helpers/testUser');

describe('Announcements — audience targeting visibility', () => {
  let instructor;
  let instructorToken;
  let track;
  let course;

  beforeEach(async () => {
    const inst = await createTestUser({ role: 'instructor' });
    instructor = inst.user;
    instructorToken = inst.token;

    track = await Track.create({
      title: 'Targeting Track',
      description: 'Used for announcement audience tests',
      instructor: instructor._id,
    });

    course = await Course.create({
      title: 'Targeting Course',
      description: 'Used for announcement audience tests',
      instructor: instructor._id,
    });
  });

  async function createAnnouncement(payload) {
    const res = await request(app)
      .post('/v1/announcements')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send(payload);
    expect(res.status).toBe(201);
    return res.body.data.announcement._id;
  }

  describe('audience: track', () => {
    it('is visible in the list to a student enrolled in the target track', async () => {
      const { token: studentToken, user: student } = await createTestUser({
        role: 'student',
      });
      await User.findByIdAndUpdate(student._id, { enrolledTrack: track._id });

      const id = await createAnnouncement({
        title: 'Track-only announcement',
        message: 'Visible to track members only.',
        audience: 'track',
        targetTrack: track._id.toString(),
      });

      const listRes = await request(app)
        .get('/v1/announcements')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(listRes.body.data.announcements.some((a) => a._id === id)).toBe(
        true,
      );

      const singleRes = await request(app)
        .get(`/v1/announcements/${id}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(singleRes.status).toBe(200);
    });

    it('is hidden (404) from a student not enrolled in the target track', async () => {
      const { token: outsiderToken } = await createTestUser({
        role: 'student',
      });

      const id = await createAnnouncement({
        title: 'Track-only announcement',
        message: 'Visible to track members only.',
        audience: 'track',
        targetTrack: track._id.toString(),
      });

      const listRes = await request(app)
        .get('/v1/announcements')
        .set('Authorization', `Bearer ${outsiderToken}`);
      expect(listRes.body.data.announcements.some((a) => a._id === id)).toBe(
        false,
      );

      const singleRes = await request(app)
        .get(`/v1/announcements/${id}`)
        .set('Authorization', `Bearer ${outsiderToken}`);
      expect(singleRes.status).toBe(404);
    });

    it('is hidden from an anonymous (unauthenticated) visitor', async () => {
      const id = await createAnnouncement({
        title: 'Track-only announcement',
        message: 'Visible to track members only.',
        audience: 'track',
        targetTrack: track._id.toString(),
      });

      const res = await request(app).get(`/v1/announcements/${id}`);
      expect(res.status).toBe(404);
    });
  });

  describe('audience: course', () => {
    it('is visible to a student enrolled in the target course', async () => {
      const { token: studentToken, user: student } = await createTestUser({
        role: 'student',
      });
      await User.findByIdAndUpdate(student._id, {
        enrolledCourses: [course._id],
      });

      const id = await createAnnouncement({
        title: 'Course-only announcement',
        message: 'Visible to course members only.',
        audience: 'course',
        targetCourse: course._id.toString(),
      });

      const listRes = await request(app)
        .get('/v1/announcements')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(listRes.body.data.announcements.some((a) => a._id === id)).toBe(
        true,
      );

      const singleRes = await request(app)
        .get(`/v1/announcements/${id}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(singleRes.status).toBe(200);
    });

    it('is hidden (404) from a student not enrolled in the target course', async () => {
      const { token: outsiderToken } = await createTestUser({
        role: 'student',
      });

      const id = await createAnnouncement({
        title: 'Course-only announcement',
        message: 'Visible to course members only.',
        audience: 'course',
        targetCourse: course._id.toString(),
      });

      const singleRes = await request(app)
        .get(`/v1/announcements/${id}`)
        .set('Authorization', `Bearer ${outsiderToken}`);
      expect(singleRes.status).toBe(404);
    });
  });

  describe("creator's own visibility", () => {
    it('lets the creating instructor see their own targeted announcement even though not enrolled', async () => {
      const id = await createAnnouncement({
        title: 'Own Track Announcement',
        message: 'The instructor created this for the track.',
        audience: 'track',
        targetTrack: track._id.toString(),
      });

      const res = await request(app)
        .get(`/v1/announcements/${id}`)
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(res.status).toBe(200);

      const listRes = await request(app)
        .get('/v1/announcements')
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(listRes.body.data.announcements.some((a) => a._id === id)).toBe(
        true,
      );
    });
  });

  describe('audience: all', () => {
    it('is visible to anonymous visitors and any authenticated user', async () => {
      const id = await createAnnouncement({
        title: 'Public Announcement',
        message: 'Everyone can see this one.',
        audience: 'all',
      });

      const anonRes = await request(app).get(`/v1/announcements/${id}`);
      expect(anonRes.status).toBe(200);
    });
  });
});
