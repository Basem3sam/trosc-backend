const request = require('supertest');
const app = require('../src/app');
const Track = require('../src/models/track.model');
const Course = require('../src/models/course.model');
const Session = require('../src/models/session.model');
const User = require('../src/models/user.model');
const { buildAuthzFixture } = require('./helpers/authzFixture');

const get = (path, who) => {
  const req = request(app).get(path);
  if (!who || !who.token) return req;
  return req.set('Authorization', `Bearer ${who.token}`);
};
const titles = (res, key) => res.body.data[key].map((x) => x.title);

// Package 2: every Track/Course/Session sub-list applies the Q5 draft filter
// and the Q7 membership redaction.
describe('carry-over sub-lists (Package 2)', () => {
  let f;
  let draftCourse;
  let draftSession;

  beforeEach(async () => {
    f = await buildAuthzFixture();
    draftCourse = await Course.create({
      title: 'Hidden Draft Course',
      description: 'Draft inside the authz track',
      instructor: f.courseInst.user._id,
      track: f.track._id,
      students: [f.student.user._id],
      published: false,
    });
    draftSession = await Session.create({
      title: 'Hidden Draft Session',
      instructor: f.sessionInst.user._id,
      tracks: [f.track._id],
      students: [f.student.user._id],
      published: false,
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
  });

  describe('GET /courses/track/:trackId and /courses/instructor/:id', () => {
    it('anonymous and students get published courses only, no raw students', async () => {
      const path = `/v1/courses/track/${f.track.id}`;
      const anon = await get(path);
      expect(anon.status).toBe(200);
      expect(titles(anon, 'courses')).toContain('Authz Course');
      expect(titles(anon, 'courses')).not.toContain('Hidden Draft Course');
      anon.body.data.courses.forEach((c) => {
        expect(c).not.toHaveProperty('students');
        expect(c).toHaveProperty('studentCount');
        expect(c.isEnrolled).toBe(false);
      });

      const stu = await get(path, f.student);
      expect(titles(stu, 'courses')).not.toContain('Hidden Draft Course');
      const { courses } = stu.body.data;
      const mine = courses.find((c) => c.title === 'Authz Course');
      expect(mine.isEnrolled).toBe(true);

      const instPath = `/v1/courses/instructor/${f.courseInst.user.id}`;
      const byInst = await get(instPath);
      expect(titles(byInst, 'courses')).not.toContain('Hidden Draft Course');
      byInst.body.data.courses.forEach((c) =>
        expect(c).not.toHaveProperty('students'),
      );
    });

    it('staff who manage the draft see it (and keep the students array)', async () => {
      const path = `/v1/courses/track/${f.track.id}`;
      // lead and co-instructor of the track, the course instructor, admin
      // eslint-disable-next-line no-restricted-syntax
      for (const who of [f.lead, f.co, f.courseInst, f.admin]) {
        // eslint-disable-next-line no-await-in-loop
        const res = await get(path, who);
        expect(titles(res, 'courses')).toContain('Hidden Draft Course');
        const c = res.body.data.courses.find((x) => x.title === 'Authz Course');
        expect(Array.isArray(c.students)).toBe(true);
      }
      // unrelated instructor and a demoted ex-co-instructor do not
      // eslint-disable-next-line no-restricted-syntax
      for (const who of [f.stranger, f.demoted]) {
        // eslint-disable-next-line no-await-in-loop
        const res = await get(path, who);
        expect(titles(res, 'courses')).not.toContain('Hidden Draft Course');
        res.body.data.courses.forEach((c) =>
          expect(c).not.toHaveProperty('students'),
        );
      }
    });
  });

  describe('student sub-lists hide enrolled-but-unpublished content', () => {
    it('GET /courses/student/:id', async () => {
      const path = `/v1/courses/student/${f.student.user.id}`;
      const own = await get(path, f.student);
      expect(own.status).toBe(200);
      expect(titles(own, 'courses')).toContain('Authz Course');
      expect(titles(own, 'courses')).not.toContain('Hidden Draft Course');
      own.body.data.courses.forEach((c) => {
        expect(c).not.toHaveProperty('students');
        expect(c.isEnrolled).toBe(true);
      });

      const admin = await get(path, f.admin);
      expect(titles(admin, 'courses')).toContain('Hidden Draft Course');
    });

    it('GET /tracks/student/:id hides an unpublished enrolled track', async () => {
      await Track.updateOne({ _id: f.track._id }, { published: false });
      const path = `/v1/tracks/student/${f.student.user.id}`;
      const own = await get(path, f.student);
      expect(own.status).toBe(200);
      expect(own.body.data.tracks).toHaveLength(0);
      expect((await get(path, f.admin)).body.data.tracks).toHaveLength(1);

      await Track.updateOne({ _id: f.track._id }, { published: true });
      const again = await get(path, f.student);
      expect(again.body.data.tracks).toHaveLength(1);
      const t = again.body.data.tracks[0];
      expect(t).not.toHaveProperty('students');
      expect(t).not.toHaveProperty('pendingStudents');
      expect(t.isEnrolled).toBe(true);
    });

    it('GET /sessions/student/:id hides drafts and the raw arrays', async () => {
      await Session.updateOne(
        { _id: f.session._id },
        { $addToSet: { students: f.student.user._id } },
      );
      const path = `/v1/sessions/student/${f.student.user.id}`;
      const own = await get(path, f.student);
      expect(own.status).toBe(200);
      expect(titles(own, 'sessions')).toContain('Authz Session');
      expect(titles(own, 'sessions')).not.toContain('Hidden Draft Session');
      own.body.data.sessions.forEach((s) => {
        expect(s).not.toHaveProperty('students');
        expect(s).not.toHaveProperty('progress');
        expect(s.isEnrolled).toBe(true);
      });
      const admin = await get(path, f.admin);
      expect(titles(admin, 'sessions')).toContain('Hidden Draft Session');
    });

    it('GET /users/me/enrollments hides unpublished content', async () => {
      await User.updateOne(
        { _id: f.student.user._id },
        {
          enrolledTrack: f.track._id,
          enrolledCourses: [f.course._id, draftCourse._id],
          enrolledSessions: [f.session._id, draftSession._id],
        },
      );
      const res = await get('/v1/users/me/enrollments', f.student);
      expect(res.status).toBe(200);
      expect(titles(res, 'courses')).toEqual(['Authz Course']);
      expect(titles(res, 'sessions')).toEqual(['Authz Session']);
      expect(res.body.data.tracks).toHaveLength(1);
    });
  });

  describe('GET /tracks/:id/session-catalog (public, published only)', () => {
    it('omits draft sessions and 404s for a draft track', async () => {
      const path = `/v1/tracks/${f.track.id}/session-catalog`;
      const res = await get(path);
      expect(res.status).toBe(200);
      expect(titles(res, 'sessions')).toContain('Authz Session');
      expect(titles(res, 'sessions')).not.toContain('Hidden Draft Session');

      await Track.updateOne({ _id: f.track._id }, { published: false });
      expect((await get(path)).status).toBe(404);
    });
  });
});
