const request = require('supertest');
const app = require('../src/app');
const Track = require('../src/models/track.model');
const Course = require('../src/models/course.model');
const Session = require('../src/models/session.model');
const { createTestUser } = require('./helpers/testUser');
const generateToken = require('../src/utils/generateToken');

// BACKEND-REQUESTS-2 Q7: raw membership arrays (`students`,
// `pendingStudents`, `pendingLeaves`) must not reach a non-staff caller —
// replaced with `studentCount`/`isEnrolled`/`isPending`/`isPendingLeave`.
// Staff (the resource's current owner, or an admin) still get what they
// legitimately need.
describe('Membership-array redaction (Q7)', () => {
  let owner;
  let ownerToken;
  let adminToken;
  let enrolledStudent;
  let enrolledStudentToken;
  let pendingApplicant;
  let pendingLeaver;
  let outsiderToken;

  beforeEach(async () => {
    const ownerPair = await createTestUser({ role: 'instructor' });
    owner = ownerPair.user;
    ownerToken = ownerPair.token;
    adminToken = (await createTestUser({ role: 'admin' })).token;
    const enrolledPair = await createTestUser({ role: 'student' });
    enrolledStudent = enrolledPair.user;
    enrolledStudentToken = enrolledPair.token;
    pendingApplicant = (await createTestUser({ role: 'student' })).user;
    pendingLeaver = (await createTestUser({ role: 'student' })).user;
    outsiderToken = (await createTestUser({ role: 'student' })).token;
  });

  describe('Track', () => {
    let track;

    beforeEach(async () => {
      track = await Track.create({
        title: 'Membership Track',
        description: 'Has students, pending joins and pending leaves',
        instructor: owner._id,
        published: true,
        students: [enrolledStudent._id],
        pendingStudents: [pendingApplicant._id],
        pendingLeaves: [pendingLeaver._id],
      });
    });

    describe('GET /v1/tracks/:id', () => {
      it('hides students/pendingStudents/pendingLeaves from an outsider, exposing studentCount/isEnrolled/isPending/isPendingLeave instead', async () => {
        const res = await request(app)
          .get(`/v1/tracks/${track._id}`)
          .set('Authorization', `Bearer ${outsiderToken}`);
        const t = res.body.data.track;
        expect(t.students).toBeUndefined();
        expect(t.pendingStudents).toBeUndefined();
        expect(t.pendingLeaves).toBeUndefined();
        expect(t.studentCount).toBe(1);
        expect(t.isEnrolled).toBe(false);
        expect(t.isPending).toBe(false);
        expect(t.isPendingLeave).toBe(false);
      });

      it("reflects the caller's own pending-join status", async () => {
        const applicantToken = generateToken(pendingApplicant._id);
        const res = await request(app)
          .get(`/v1/tracks/${track._id}`)
          .set('Authorization', `Bearer ${applicantToken}`);
        expect(res.body.data.track.isPending).toBe(true);
        expect(res.body.data.track.pendingStudents).toBeUndefined();
      });

      it('populates students for an enrolled (non-staff) caller, but still hides pendingStudents/pendingLeaves — those are staff-only', async () => {
        const res = await request(app)
          .get(`/v1/tracks/${track._id}`)
          .set('Authorization', `Bearer ${enrolledStudentToken}`);
        const t = res.body.data.track;
        expect(Array.isArray(t.students)).toBe(true);
        expect(t.isEnrolled).toBe(true);
        expect(t.pendingStudents).toBeUndefined();
        expect(t.pendingLeaves).toBeUndefined();
        expect(t.isPending).toBe(false);
        expect(t.isPendingLeave).toBe(false);
      });

      it('gives the owning instructor the raw pendingStudents/pendingLeaves arrays', async () => {
        const res = await request(app)
          .get(`/v1/tracks/${track._id}`)
          .set('Authorization', `Bearer ${ownerToken}`);
        const t = res.body.data.track;
        expect(t.pendingStudents).toEqual(
          expect.arrayContaining([pendingApplicant._id.toString()]),
        );
        expect(t.pendingLeaves).toEqual(
          expect.arrayContaining([pendingLeaver._id.toString()]),
        );
      });

      it('gives an admin the raw pendingStudents/pendingLeaves arrays too', async () => {
        const res = await request(app)
          .get(`/v1/tracks/${track._id}`)
          .set('Authorization', `Bearer ${adminToken}`);
        const t = res.body.data.track;
        expect(t.pendingStudents).toEqual(
          expect.arrayContaining([pendingApplicant._id.toString()]),
        );
      });
    });

    describe('GET /v1/tracks (list)', () => {
      it('hides membership arrays from an outsider', async () => {
        const res = await request(app)
          .get('/v1/tracks')
          .set('Authorization', `Bearer ${outsiderToken}`);
        const found = res.body.data.tracks.find(
          (t) => t._id === track._id.toString(),
        );
        expect(found.students).toBeUndefined();
        expect(found.pendingStudents).toBeUndefined();
        expect(found.pendingLeaves).toBeUndefined();
        expect(found.studentCount).toBe(1);
      });

      it('keeps the raw arrays for the owning instructor', async () => {
        const res = await request(app)
          .get('/v1/tracks')
          .set('Authorization', `Bearer ${ownerToken}`);
        const found = res.body.data.tracks.find(
          (t) => t._id === track._id.toString(),
        );
        expect(found.pendingStudents).toBeDefined();
      });
    });
  });

  describe('GET /v1/tracks/popular', () => {
    it('never exposes students/pendingStudents/pendingLeaves — this aggregation is fully public', async () => {
      await Track.create({
        title: 'Popular Membership Track',
        description: 'Has students and a pending applicant',
        instructor: owner._id,
        published: true,
        students: [enrolledStudent._id],
        pendingStudents: [pendingApplicant._id],
      });

      const res = await request(app).get('/v1/tracks/popular?limit=5');
      expect(res.status).toBe(200);
      const found = res.body.data.tracks.find(
        (t) => t.title === 'Popular Membership Track',
      );
      expect(found).toBeDefined();
      expect(found.students).toBeUndefined();
      expect(found.pendingStudents).toBeUndefined();
      expect(found.pendingLeaves).toBeUndefined();
      expect(found.studentCount).toBe(1);
    });
  });

  describe('Course', () => {
    let course;

    beforeEach(async () => {
      course = await Course.create({
        title: 'Membership Course',
        description: 'Has one enrolled student',
        instructor: owner._id,
        published: true,
        students: [enrolledStudent._id],
      });
    });

    describe('GET /v1/courses/:id', () => {
      it('hides students from an outsider, exposing studentCount/isEnrolled instead', async () => {
        const res = await request(app)
          .get(`/v1/courses/${course._id}`)
          .set('Authorization', `Bearer ${outsiderToken}`);
        const c = res.body.data.course;
        expect(c.students).toBeUndefined();
        expect(c.studentCount).toBe(1);
        expect(c.isEnrolled).toBe(false);
      });

      it('populates students for the enrolled student', async () => {
        const res = await request(app)
          .get(`/v1/courses/${course._id}`)
          .set('Authorization', `Bearer ${enrolledStudentToken}`);
        expect(Array.isArray(res.body.data.course.students)).toBe(true);
        expect(res.body.data.course.isEnrolled).toBe(true);
      });

      it('populates students for the owning instructor', async () => {
        const res = await request(app)
          .get(`/v1/courses/${course._id}`)
          .set('Authorization', `Bearer ${ownerToken}`);
        expect(Array.isArray(res.body.data.course.students)).toBe(true);
      });
    });

    describe('GET /v1/courses (list)', () => {
      it('hides students from an anonymous caller', async () => {
        const res = await request(app).get('/v1/courses');
        const found = res.body.data.courses.find(
          (c) => c._id === course._id.toString(),
        );
        expect(found.students).toBeUndefined();
        expect(found.studentCount).toBe(1);
        expect(found.isEnrolled).toBe(false);
      });
    });
  });

  describe('Session', () => {
    let session;

    beforeEach(async () => {
      session = await Session.create({
        title: 'Membership Session',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        instructor: owner._id,
        published: true,
        students: [enrolledStudent._id],
      });
    });

    describe('GET /v1/sessions/:id', () => {
      it('hides students from a non-enrolled outsider, exposing studentCount/isEnrolled instead', async () => {
        const res = await request(app)
          .get(`/v1/sessions/${session._id}`)
          .set('Authorization', `Bearer ${outsiderToken}`);
        const s = res.body.data.session;
        expect(s.students).toBeUndefined();
        expect(s.studentCount).toBe(1);
        expect(s.isEnrolled).toBe(false);
      });

      it('reports isEnrolled: true and full content for the enrolled student', async () => {
        const res = await request(app)
          .get(`/v1/sessions/${session._id}`)
          .set('Authorization', `Bearer ${enrolledStudentToken}`);
        expect(res.body.data.session.isEnrolled).toBe(true);
        expect(res.body.data.session.url).toBeDefined();
      });
    });

    describe('GET /v1/sessions (list)', () => {
      it('never includes the raw students array, but does include studentCount', async () => {
        const res = await request(app)
          .get('/v1/sessions')
          .set('Authorization', `Bearer ${outsiderToken}`);
        const found = res.body.data.sessions.find(
          (s) => s._id === session._id.toString(),
        );
        expect(found.students).toBeUndefined();
        expect(found.studentCount).toBe(1);
      });
    });
  });
});
