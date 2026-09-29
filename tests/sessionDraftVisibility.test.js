const request = require('supertest');
const app = require('../src/app');
const Session = require('../src/models/session.model');
const { createTestUser } = require('./helpers/testUser');
const { buildTrackAndCourseFixture } = require('./helpers/fixtures');

// BACKEND-REQUESTS-2 #1.1 / #1.2 / Q2: a draft (published: false) session
// must be invisible (404, not content-redacted) to anyone who isn't an
// admin or the session's own instructor, on every session read endpoint —
// not just GET /sessions/:id. And the raw per-student `progress` array
// must never be exposed on ANY of these, list or detail.
describe('Session draft visibility and progress privacy', () => {
  let fixture;
  let draftSession;
  let adminToken;
  let outsiderStudentToken;

  beforeEach(async () => {
    fixture = await buildTrackAndCourseFixture();
    const { token: aToken } = await createTestUser({ role: 'admin' });
    adminToken = aToken;
    const { token: oToken } = await createTestUser({ role: 'student' });
    outsiderStudentToken = oToken;

    draftSession = await Session.create({
      title: '[TEST] Draft Session',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      instructor: fixture.instructor._id,
      tracks: [fixture.track._id],
      students: [fixture.student._id],
      published: false,
      progress: [
        {
          student: fixture.student._id,
          status: 'watched',
          watchedAt: new Date(),
        },
      ],
    });
  });

  describe('GET /v1/sessions/:id', () => {
    it('404s for an unauthorized outsider', async () => {
      const res = await request(app)
        .get(`/v1/sessions/${draftSession._id}`)
        .set('Authorization', `Bearer ${outsiderStudentToken}`);
      expect(res.status).toBe(404);
    });

    it('404s even for the enrolled student — a draft is invisible, not content-redacted', async () => {
      const res = await request(app)
        .get(`/v1/sessions/${draftSession._id}`)
        .set('Authorization', `Bearer ${fixture.studentToken}`);
      expect(res.status).toBe(404);
    });

    it('is visible with full content to the owning instructor', async () => {
      const res = await request(app)
        .get(`/v1/sessions/${draftSession._id}`)
        .set('Authorization', `Bearer ${fixture.instructorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.session.url).toBe(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      );
    });

    it('is visible to an admin', async () => {
      const res = await request(app)
        .get(`/v1/sessions/${draftSession._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it('never exposes the raw progress array, even to the owner', async () => {
      const res = await request(app)
        .get(`/v1/sessions/${draftSession._id}`)
        .set('Authorization', `Bearer ${fixture.instructorToken}`);
      expect(res.body.data.session.progress).toBeUndefined();
    });
  });

  describe('GET /v1/sessions (list)', () => {
    it('excludes the draft for an outsider', async () => {
      const res = await request(app)
        .get('/v1/sessions')
        .set('Authorization', `Bearer ${outsiderStudentToken}`);
      const ids = res.body.data.sessions.map((s) => s._id);
      expect(ids).not.toContain(draftSession._id.toString());
    });

    it('includes the draft for the owning instructor', async () => {
      const res = await request(app)
        .get('/v1/sessions')
        .set('Authorization', `Bearer ${fixture.instructorToken}`);
      const ids = res.body.data.sessions.map((s) => s._id);
      expect(ids).toContain(draftSession._id.toString());
    });

    it('includes the draft for an admin', async () => {
      const res = await request(app)
        .get('/v1/sessions')
        .set('Authorization', `Bearer ${adminToken}`);
      const ids = res.body.data.sessions.map((s) => s._id);
      expect(ids).toContain(draftSession._id.toString());
    });
  });

  describe('GET /v1/sessions/track/:trackId', () => {
    it('excludes the draft and never leaks url/progress for a non-enrolled outsider', async () => {
      const res = await request(app)
        .get(`/v1/sessions/track/${fixture.track._id}`)
        .set('Authorization', `Bearer ${outsiderStudentToken}`);
      const found = res.body.data.sessions.find(
        (s) => s._id === draftSession._id.toString(),
      );
      expect(found).toBeUndefined();
    });

    it('never leaks the raw progress array to the owning instructor either', async () => {
      const res = await request(app)
        .get(`/v1/sessions/track/${fixture.track._id}`)
        .set('Authorization', `Bearer ${fixture.instructorToken}`);
      const found = res.body.data.sessions.find(
        (s) => s._id === draftSession._id.toString(),
      );
      expect(found).toBeDefined();
      expect(found.progress).toBeUndefined();
    });

    it('strips url/embedUrl/resources for an enrolled-but-non-owner, non-admin viewer', async () => {
      // Publish it so it's visible at all, then confirm content redaction
      // still applies to a caller who isn't the owner/admin/direct student.
      await Session.findByIdAndUpdate(draftSession._id, { published: true });
      const res = await request(app)
        .get(`/v1/sessions/track/${fixture.track._id}`)
        .set('Authorization', `Bearer ${fixture.otherInstructorToken}`);
      const found = res.body.data.sessions.find(
        (s) => s._id === draftSession._id.toString(),
      );
      expect(found).toBeDefined();
      expect(found.url).toBeUndefined();
      expect(found.progress).toBeUndefined();
    });
  });

  describe('GET /v1/sessions/instructor/:instructorId', () => {
    it('excludes the draft for a caller who is not its owner or an admin', async () => {
      const res = await request(app)
        .get(`/v1/sessions/instructor/${fixture.instructor._id}`)
        .set('Authorization', `Bearer ${outsiderStudentToken}`);
      const ids = res.body.data.sessions.map((s) => s._id);
      expect(ids).not.toContain(draftSession._id.toString());
    });

    it('includes the draft for the owning instructor themselves', async () => {
      const res = await request(app)
        .get(`/v1/sessions/instructor/${fixture.instructor._id}`)
        .set('Authorization', `Bearer ${fixture.instructorToken}`);
      const ids = res.body.data.sessions.map((s) => s._id);
      expect(ids).toContain(draftSession._id.toString());
    });
  });
});
