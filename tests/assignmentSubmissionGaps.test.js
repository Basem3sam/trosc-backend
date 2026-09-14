const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Assignment = require('../src/models/assignment.model');
const Course = require('../src/models/course.model');
const { createTestUser } = require('./helpers/testUser');
const { buildTrackAndCourseFixture } = require('./helpers/fixtures');

describe('Assignment submissions — edge case branches', () => {
  it('POST /v1/assignments/:id/submissions 404s for a non-existent assignment', async () => {
    const { token: studentToken } = await createTestUser({ role: 'student' });
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post(`/v1/assignments/${fakeId}/submissions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ file: 'https://drive.google.com/file/d/abc123' });

    expect(res.status).toBe(404);
  });

  it('rejects a submission from a student not enrolled in the course', async () => {
    const { course, instructor } = await buildTrackAndCourseFixture();
    const { token: outsiderToken } = await createTestUser({
      role: 'student',
    });

    const assignment = await Assignment.create({
      title: 'Enrollment Guard Assignment',
      description: 'Only enrolled students may submit',
      instructor: instructor._id,
      course: course._id,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const res = await request(app)
      .post(`/v1/assignments/${assignment._id}/submissions`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ file: 'https://drive.google.com/file/d/abc123' });

    expect(res.status).toBe(403);
  });

  it('404s a submission attempt when the parent course was deleted after the assignment was created', async () => {
    const { course, instructor, studentToken } =
      await buildTrackAndCourseFixture();

    const assignment = await Assignment.create({
      title: 'Orphaned Assignment',
      description: 'Its course will be deleted directly',
      instructor: instructor._id,
      course: course._id,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Delete the parent course directly (bypassing the normal
    // deleteCourse cascade) to simulate a dangling reference.
    await Course.findByIdAndDelete(course._id);

    const res = await request(app)
      .post(`/v1/assignments/${assignment._id}/submissions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ file: 'https://drive.google.com/file/d/abc123' });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/no longer exists/);
  });

  it('PATCH .../grade 404s for a non-existent assignment (admin bypasses ownership check)', async () => {
    const { token: adminToken } = await createTestUser({ role: 'admin' });
    const { user: student } = await createTestUser({
      role: 'student',
    });
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .patch(`/v1/assignments/${fakeId}/submissions/${student._id}/grade`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ grade: 90 });

    expect(res.status).toBe(404);
  });

  it('rejects grading when the "student" being graded is actually the owning instructor', async () => {
    const { course, instructor, instructorToken } =
      await buildTrackAndCourseFixture();

    const assignment = await Assignment.create({
      title: 'Self-Grade Guard Assignment',
      description: 'Instructor should not be able to grade themselves',
      instructor: instructor._id,
      course: course._id,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      submissions: [
        {
          student: instructor._id,
          file: 'https://drive.google.com/file/d/self',
        },
      ],
    });

    const res = await request(app)
      .patch(
        `/v1/assignments/${assignment._id}/submissions/${instructor._id}/grade`,
      )
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ grade: 100 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(
      /An instructor cannot grade their own submission/,
    );
  });
});
