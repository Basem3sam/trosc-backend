const request = require('supertest');
const app = require('../../src/app');
const Course = require('../../src/models/course.model');
const Session = require('../../src/models/session.model');
const Track = require('../../src/models/track.model');
const { createTestUser } = require('../helpers/testUser');
const { buildTrackAndCourseFixture } = require('../helpers/fixtures');

describe('Course Controller – Missing Endpoints', () => {
  describe('add/remove session to/from course', () => {
    let instructor;
    let instructorToken;
    let course;
    let session;
    let otherInstructorToken;

    beforeEach(async () => {
      const fixture = await buildTrackAndCourseFixture();
      instructor = fixture.instructor;
      instructorToken = fixture.instructorToken;
      course = fixture.course;
      otherInstructorToken = fixture.otherInstructorToken;

      // Create a standalone session not attached to any course
      session = await Session.create({
        title: 'Standalone Session',
        instructor: instructor._id,
        published: true,
      });
    });

    it('PATCH /v1/courses/:courseId/sessions/:sessionId – adds a session to a course (owner instructor)', async () => {
      const res = await request(app)
        .patch(`/v1/courses/${course._id}/sessions/${session._id}`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.course.sessions).toContain(session._id.toString());
    });

    it('PATCH – rejects if session already in course', async () => {
      // First add
      await request(app)
        .patch(`/v1/courses/${course._id}/sessions/${session._id}`)
        .set('Authorization', `Bearer ${instructorToken}`);

      const res = await request(app)
        .patch(`/v1/courses/${course._id}/sessions/${session._id}`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Session already exists/i);
    });

    it('PATCH – rejects if instructor does not own the course', async () => {
      const res = await request(app)
        .patch(`/v1/courses/${course._id}/sessions/${session._id}`)
        .set('Authorization', `Bearer ${otherInstructorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/only modify your own content/i);
    });

    it('DELETE /v1/courses/:courseId/sessions/:sessionId – removes a session from a course (owner instructor)', async () => {
      // First add
      await request(app)
        .patch(`/v1/courses/${course._id}/sessions/${session._id}`)
        .set('Authorization', `Bearer ${instructorToken}`);

      const res = await request(app)
        .delete(`/v1/courses/${course._id}/sessions/${session._id}`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.course.sessions).not.toContain(
        session._id.toString(),
      );
    });

    it('DELETE – rejects if session not in course', async () => {
      const res = await request(app)
        .delete(`/v1/courses/${course._id}/sessions/${session._id}`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Session is not in this course/i);
    });

    it('DELETE – rejects if instructor does not own the course', async () => {
      const res = await request(app)
        .delete(`/v1/courses/${course._id}/sessions/${session._id}`)
        .set('Authorization', `Bearer ${otherInstructorToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('add/remove student to/from course', () => {
    let instructor;
    let instructorToken;
    let course;
    let student;
    let studentToken;
    let otherInstructorToken;

    beforeEach(async () => {
      const fixture = await buildTrackAndCourseFixture();
      instructor = fixture.instructor;
      instructorToken = fixture.instructorToken;
      course = fixture.course;
      student = fixture.student;
      studentToken = fixture.studentToken;
      otherInstructorToken = fixture.otherInstructorToken;
    });

    it('POST /v1/courses/:id/students – adds a student to a course (owner instructor)', async () => {
      // Remove student first if already enrolled (from fixture)
      if (course.students.includes(student._id)) {
        await Course.findByIdAndUpdate(course._id, {
          $pull: { students: student._id },
        });
      }

      const res = await request(app)
        .post(`/v1/courses/${course._id}/students`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ studentId: student._id });

      expect(res.status).toBe(200);
      expect(res.body.data.course.students).toContain(student._id.toString());
    });

    it('POST – rejects if student already enrolled', async () => {
      const res = await request(app)
        .post(`/v1/courses/${course._id}/students`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ studentId: student._id });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already enrolled/i);
    });

    it('POST – rejects if instructor does not own the course', async () => {
      const res = await request(app)
        .post(`/v1/courses/${course._id}/students`)
        .set('Authorization', `Bearer ${otherInstructorToken}`)
        .send({ studentId: student._id });

      expect(res.status).toBe(403);
    });

    it('DELETE /v1/courses/:id/students/:studentId – removes a student from a course (owner instructor)', async () => {
      const res = await request(app)
        .delete(`/v1/courses/${course._id}/students/${student._id}`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.course.students).not.toContain(
        student._id.toString(),
      );
    });

    it('DELETE – rejects if student not enrolled', async () => {
      // Ensure student is not enrolled
      await Course.findByIdAndUpdate(course._id, {
        $pull: { students: student._id },
      });

      const res = await request(app)
        .delete(`/v1/courses/${course._id}/students/${student._id}`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/not enrolled/i);
    });

    it('DELETE – rejects if instructor does not own the course', async () => {
      const res = await request(app)
        .delete(`/v1/courses/${course._id}/students/${student._id}`)
        .set('Authorization', `Bearer ${otherInstructorToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('filtering endpoints', () => {
    let instructor;
    let instructorToken;
    let course;
    let student;
    let studentToken;
    let track;

    beforeEach(async () => {
      const fixture = await buildTrackAndCourseFixture();
      instructor = fixture.instructor;
      instructorToken = fixture.instructorToken;
      course = fixture.course;
      student = fixture.student;
      studentToken = fixture.studentToken;
      track = fixture.track;
    });

    it('GET /v1/courses/instructor/:instructorId – returns courses by instructor', async () => {
      const res = await request(app).get(
        `/v1/courses/instructor/${instructor._id}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.results).toBeGreaterThan(0);
      expect(res.body.data.courses[0].instructor._id).toBe(
        instructor._id.toString(),
      );
    });

    it('GET /v1/courses/track/:trackId – returns courses in a track', async () => {
      const res = await request(app).get(`/v1/courses/track/${track._id}`);

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(1);
      expect(res.body.data.courses[0].track._id).toBe(track._id.toString());
    });

    it('GET /v1/courses/student/:studentId – returns courses a student is enrolled in (self or admin)', async () => {
      const res = await request(app)
        .get(`/v1/courses/student/${student._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(1);
      expect(res.body.data.courses[0].students).toContain(
        student._id.toString(),
      );
    });

    it("GET – rejects if student tries to view another student's courses", async () => {
      const otherStudent = await createTestUser({ role: 'student' });
      const res = await request(app)
        .get(`/v1/courses/student/${otherStudent.user._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/only view your own enrollments/i);
    });
  });
});
