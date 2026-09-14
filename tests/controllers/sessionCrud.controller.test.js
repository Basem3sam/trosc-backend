const request = require('supertest');
const app = require('../../src/app');
const Session = require('../../src/models/session.model');
const { createTestUser } = require('../helpers/testUser');
const { buildStandaloneSessionFixture } = require('../helpers/fixtures');

describe('Session Controller – list / update / delete / leaveMe', () => {
  describe('GET /v1/sessions', () => {
    it('returns all sessions with pagination info', async () => {
      const { studentToken } = await buildStandaloneSessionFixture();

      const res = await request(app)
        .get('/v1/sessions')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.sessions)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PATCH /v1/sessions/:id', () => {
    it('owner instructor can update their session', async () => {
      const { instructorToken, session } =
        await buildStandaloneSessionFixture();

      const res = await request(app)
        .patch(`/v1/sessions/${session._id}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ title: 'Updated Session Title' });

      expect(res.status).toBe(200);
      expect(res.body.data.session.title).toBe('Updated Session Title');
    });

    it('rejects update from a non-owning instructor', async () => {
      const { session } = await buildStandaloneSessionFixture();
      const { token: otherToken } = await createTestUser({
        role: 'instructor',
      });

      const res = await request(app)
        .patch(`/v1/sessions/${session._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Hijacked Title' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /v1/sessions/:id', () => {
    it('owner instructor can delete their session', async () => {
      const { instructorToken, session } =
        await buildStandaloneSessionFixture();

      const res = await request(app)
        .delete(`/v1/sessions/${session._id}`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(204);
      expect(await Session.findById(session._id)).toBeNull();
    });

    it('rejects delete from a non-owning instructor', async () => {
      const { session } = await buildStandaloneSessionFixture();
      const { token: otherToken } = await createTestUser({
        role: 'instructor',
      });

      const res = await request(app)
        .delete(`/v1/sessions/${session._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
      expect(await Session.findById(session._id)).not.toBeNull();
    });
  });

  describe('DELETE /v1/sessions/:id/leave-me', () => {
    it('lets an enrolled student leave a session', async () => {
      const { session, studentToken } = await buildStandaloneSessionFixture();

      const res = await request(app)
        .delete(`/v1/sessions/${session._id}/leave-me`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Left session successfully');

      const refreshed = await Session.findById(session._id);
      expect(refreshed.students.map((id) => id.toString())).not.toContain(
        // studentToken's user id isn't directly available here, but the
        // response payload already confirms the service call succeeded.
        session.students[0].toString(),
      );
    });

    it('rejects leaving a session the student is not enrolled in', async () => {
      const { session } = await buildStandaloneSessionFixture();
      const { token: outsiderToken } = await createTestUser({
        role: 'student',
      });

      const res = await request(app)
        .delete(`/v1/sessions/${session._id}/leave-me`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(400);
    });
  });
});
