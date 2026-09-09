const request = require('supertest');

const app = require('../../src/app');

const Session = require('../../src/models/session.model');

const Track = require('../../src/models/track.model');

const { createTestUser } = require('../helpers/testUser');

const { buildStandaloneSessionFixture } = require('../helpers/fixtures');

describe('Session Controller – Missing Endpoints', () => {
  describe('add/remove student to/from session', () => {
    let instructor;
    let instructorToken;
    let session;
    let student;
    let studentToken;
    let otherInstructorToken;

    beforeEach(async () => {
      const fixture = await buildStandaloneSessionFixture();

      instructor = fixture.instructor;
      instructorToken = fixture.instructorToken;
      session = fixture.session;
      student = fixture.student;
      studentToken = fixture.studentToken;

      const otherInst = await createTestUser({
        role: 'instructor',
      });

      otherInstructorToken = otherInst.token;
    });

    it('POST /v1/sessions/:id/students – adds a student to a session (owner instructor)', async () => {
      if (
        session.students.some((id) => id.toString() === student._id.toString())
      ) {
        await Session.findByIdAndUpdate(session._id, {
          $pull: {
            students: student._id,
          },
        });
      }

      const res = await request(app)
        .post(`/v1/sessions/${session._id}/students`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          studentId: student._id,
        });

      expect(res.status).toBe(200);

      const studentIds = res.body.data.session.students.map((s) => s._id || s);

      expect(studentIds.map((id) => id.toString())).toContain(
        student._id.toString(),
      );
    });

    it('POST – rejects if student already enrolled', async () => {
      const res = await request(app)
        .post(`/v1/sessions/${session._id}/students`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          studentId: student._id,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already enrolled/i);
    });

    it('POST – rejects if instructor does not own the session', async () => {
      const res = await request(app)
        .post(`/v1/sessions/${session._id}/students`)
        .set('Authorization', `Bearer ${otherInstructorToken}`)
        .send({
          studentId: student._id,
        });

      expect(res.status).toBe(403);
    });

    it('DELETE /v1/sessions/:id/students/:studentId – removes a student from a session (owner instructor)', async () => {
      const res = await request(app)
        .delete(`/v1/sessions/${session._id}/students/${student._id}`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);

      const studentIds = res.body.data.session.students.map((s) => s._id || s);

      expect(studentIds.map((id) => id.toString())).not.toContain(
        student._id.toString(),
      );
    });

    it('DELETE – rejects if student not enrolled', async () => {
      await Session.findByIdAndUpdate(session._id, {
        $pull: {
          students: student._id,
        },
      });

      const res = await request(app)
        .delete(`/v1/sessions/${session._id}/students/${student._id}`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/not enrolled/i);
    });

    it('DELETE – rejects if instructor does not own the session', async () => {
      const res = await request(app)
        .delete(`/v1/sessions/${session._id}/students/${student._id}`)
        .set('Authorization', `Bearer ${otherInstructorToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('filtering endpoints', () => {
    let instructor;
    let instructorToken;
    let session;
    let student;
    let studentToken;
    let track;

    beforeEach(async () => {
      const fixture = await buildStandaloneSessionFixture();

      instructor = fixture.instructor;
      instructorToken = fixture.instructorToken;
      session = fixture.session;
      student = fixture.student;
      studentToken = fixture.studentToken;

      track = await Track.create({
        title: 'Test Track',
        description: 'For session filtering',
        instructor: instructor._id,
        students: [student._id],
      });

      session.tracks.push(track._id);
      await session.save();

      await Track.findByIdAndUpdate(track._id, {
        $addToSet: {
          sessions: session._id,
        },
      });
    });

    it('GET /v1/sessions/instructor/:instructorId – returns sessions by instructor', async () => {
      const res = await request(app)
        .get(`/v1/sessions/instructor/${instructor._id}`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.results).toBeGreaterThan(0);

      const returnedInstructor = res.body.data.sessions[0].instructor;

      const instructorId = returnedInstructor._id || returnedInstructor;

      expect(instructorId.toString()).toBe(instructor._id.toString());
    });

    it('GET /v1/sessions/track/:trackId – returns sessions in a track', async () => {
      const res = await request(app)
        .get(`/v1/sessions/track/${track._id}`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(1);

      const sessionTracks = res.body.data.sessions[0].tracks;

      const trackIds = sessionTracks.map((item) => item._id || item);

      expect(trackIds.map((id) => id.toString())).toContain(
        track._id.toString(),
      );
    });

    it('GET /v1/sessions/student/:studentId – returns sessions a student is enrolled in (self or admin)', async () => {
      const res = await request(app)
        .get(`/v1/sessions/student/${student._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(1);

      const sessionStudents = res.body.data.sessions[0].students;

      const studentIds = sessionStudents.map((item) => item._id || item);

      expect(studentIds.map((id) => id.toString())).toContain(
        student._id.toString(),
      );
    });

    it("GET – rejects if student tries to view another student's sessions", async () => {
      const otherStudent = await createTestUser({
        role: 'student',
      });

      const res = await request(app)
        .get(`/v1/sessions/student/${otherStudent.user._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/only view your own enrollments/i);
    });
  });
});
