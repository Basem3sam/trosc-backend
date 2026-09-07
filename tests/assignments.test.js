const request = require('supertest');
const app = require('../src/app');
const Assignment = require('../src/models/assignment.model');
const Track = require('../src/models/track.model');
const { buildTrackAndCourseFixture } = require('./helpers/fixtures');
const { createTestUser } = require('./helpers/testUser');

describe('Assignments', () => {
  describe('GET /v1/courses/:id/assignments', () => {
    it("lets an enrolled student see the course's assignments with mySubmission", async () => {
      const { track, course, instructor, student, studentToken } =
        await buildTrackAndCourseFixture();

      // Ensure the student is also in the track (for consistency)
      await Track.findByIdAndUpdate(track._id, {
        $addToSet: { students: student._id },
      });

      await Assignment.create({
        title: 'Build a REST API',
        description: 'Create a full CRUD API with Node.js',
        instructor: instructor._id,
        course: course._id,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const res = await request(app)
        .get(`/v1/courses/${course._id}/assignments`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(1);
      expect(res.body.data.assignments[0].mySubmission).toBeNull();
      expect(res.body.data.assignments[0].submissions).toBeUndefined();
    });

    it('rejects a student who is not enrolled in the course', async () => {
      const { course, instructor } = await buildTrackAndCourseFixture();
      const { token: outsiderToken } = await createTestUser({
        role: 'student',
      });

      await Assignment.create({
        title: 'Build a REST API',
        description: 'Create a full CRUD API with Node.js',
        instructor: instructor._id,
        course: course._id,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const res = await request(app)
        .get(`/v1/courses/${course._id}/assignments`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /v1/tracks/:id/assignments', () => {
    it('aggregates assignments from every course in the track', async () => {
      const { track, course, instructor, student, studentToken } =
        await buildTrackAndCourseFixture();

      // ✅ Enroll student in the track (required for track-level access)
      await Track.findByIdAndUpdate(track._id, {
        $addToSet: { students: student._id },
      });

      await Assignment.create({
        title: 'Week 1 homework',
        description: 'First assignment',
        instructor: instructor._id,
        course: course._id,
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      });

      const res = await request(app)
        .get(`/v1/tracks/${track._id}/assignments`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(1);
    });
  });

  describe('POST /v1/assignments/:id/submissions', () => {
    it('lets an enrolled student submit their work', async () => {
      const { course, instructor, studentToken } =
        await buildTrackAndCourseFixture();

      const assignment = await Assignment.create({
        title: 'Build a REST API',
        description: 'Create a full CRUD API with Node.js',
        instructor: instructor._id,
        course: course._id,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const res = await request(app)
        .post(`/v1/assignments/${assignment._id}/submissions`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ file: 'https://drive.google.com/file/d/abc123' });

      expect(res.status).toBe(200);
      expect(res.body.late).toBe(false);
      expect(res.body.data.submission.file).toBe(
        'https://drive.google.com/file/d/abc123',
      );
    });

    it('rejects a submission from an untrusted file host', async () => {
      const { course, instructor, studentToken } =
        await buildTrackAndCourseFixture();

      const assignment = await Assignment.create({
        title: 'Build a REST API',
        description: 'Create a full CRUD API with Node.js',
        instructor: instructor._id,
        course: course._id,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const res = await request(app)
        .post(`/v1/assignments/${assignment._id}/submissions`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ file: 'https://some-random-site.com/my-file.zip' });

      expect(res.status).toBe(400);
    });

    it('resubmitting overwrites the file and clears any existing grade', async () => {
      const { course, instructor, instructorToken, student, studentToken } =
        await buildTrackAndCourseFixture();

      const assignment = await Assignment.create({
        title: 'Build a REST API',
        description: 'Create a full CRUD API with Node.js',
        instructor: instructor._id,
        course: course._id,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await request(app)
        .post(`/v1/assignments/${assignment._id}/submissions`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ file: 'https://drive.google.com/file/d/first' });

      await request(app)
        .patch(
          `/v1/assignments/${assignment._id}/submissions/${student._id}/grade`,
        )
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ grade: 90 });

      const resubmitRes = await request(app)
        .post(`/v1/assignments/${assignment._id}/submissions`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ file: 'https://drive.google.com/file/d/second' });

      expect(resubmitRes.body.data.submission.file).toBe(
        'https://drive.google.com/file/d/second',
      );
      expect(resubmitRes.body.data.submission.grade).toBeUndefined();
    });
  });

  describe('PATCH /v1/assignments/:id/submissions/:studentId/grade', () => {
    it('lets the owning instructor grade a submission', async () => {
      const { course, instructor, instructorToken, student, studentToken } =
        await buildTrackAndCourseFixture();

      const assignment = await Assignment.create({
        title: 'Build a REST API',
        description: 'Create a full CRUD API with Node.js',
        instructor: instructor._id,
        course: course._id,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await request(app)
        .post(`/v1/assignments/${assignment._id}/submissions`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ file: 'https://drive.google.com/file/d/abc123' });

      const res = await request(app)
        .patch(
          `/v1/assignments/${assignment._id}/submissions/${student._id}/grade`,
        )
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ grade: 85 });

      expect(res.status).toBe(200);
      expect(res.body.data.submission.grade).toBe(85);
    });

    it('rejects grading before the student has submitted', async () => {
      const { course, instructor, instructorToken, student } =
        await buildTrackAndCourseFixture();

      const assignment = await Assignment.create({
        title: 'Build a REST API',
        description: 'Create a full CRUD API with Node.js',
        instructor: instructor._id,
        course: course._id,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const res = await request(app)
        .patch(
          `/v1/assignments/${assignment._id}/submissions/${student._id}/grade`,
        )
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ grade: 85 });

      expect(res.status).toBe(404);
    });

    it('rejects an instructor who does not own the assignment', async () => {
      const {
        course,
        instructor,
        otherInstructorToken,
        student,
        studentToken,
      } = await buildTrackAndCourseFixture();

      const assignment = await Assignment.create({
        title: 'Build a REST API',
        description: 'Create a full CRUD API with Node.js',
        instructor: instructor._id,
        course: course._id,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await request(app)
        .post(`/v1/assignments/${assignment._id}/submissions`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ file: 'https://drive.google.com/file/d/abc123' });

      const res = await request(app)
        .patch(
          `/v1/assignments/${assignment._id}/submissions/${student._id}/grade`,
        )
        .set('Authorization', `Bearer ${otherInstructorToken}`)
        .send({ grade: 85 });

      expect(res.status).toBe(403);
    });
  });
});
