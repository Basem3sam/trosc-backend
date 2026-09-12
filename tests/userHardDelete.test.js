const request = require('supertest');
const app = require('../src/app');
const Track = require('../src/models/track.model');
const Course = require('../src/models/course.model');
const Assignment = require('../src/models/assignment.model');
const Review = require('../src/models/review.model');
const { createTestUser } = require('./helpers/testUser');
const { buildTrackAndCourseFixture } = require('./helpers/fixtures');

// ===========================================================================
// PARTIAL-CASCADE DIAGNOSTIC — updated.
//
// deleteMe (self-service) soft-deletes (`active: false`). deleteUser
// (admin) and bulkUserAction('delete') hard-delete
// (findByIdAndDelete/deleteMany).
//
// As of the current implementation, hard-delete DOES clean up the
// "instructor" side of the graph — Course.instructor and Track.instructor
// are nulled out — but does NOT clean up the "student" side:
// Course.students, Assignment.submissions, and Review.user are left as
// dangling ObjectIds. This asymmetry is almost certainly a bug, not an
// intentional design. The tests below split into two groups:
//
//   1. Instructor-side tests assert the CLEANED behaviour. If these start
//      failing because cleanup was removed, that's a regression.
//   2. Student-side tests assert the CURRENT (dangling) behaviour. If
//      these start failing because cleanup was ADDED, that's the signal
//      to update them — not a bug in the test.
//
// See cascade.service.js#deleteTrackCascade for the precedent of what a
// full cascade looks like.
// ===========================================================================

describe('User hard-delete — reference cleanup diagnostic', () => {
  let adminToken;

  beforeEach(async () => {
    const admin = await createTestUser({ role: 'admin' });
    adminToken = admin.token;
  });

  describe('DELETE /v1/users/:id (admin hard delete)', () => {
    // -------------------------------------------------------------------
    // Instructor-side: cascade cleanup IS present. These tests spec it.
    // -------------------------------------------------------------------

    it('removes the instructor doc and clears Course.instructor (cascade cleanup present)', async () => {
      const { instructor, course } = await buildTrackAndCourseFixture();

      const res = await request(app)
        .delete(`/v1/users/${instructor._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(204);

      const courseDoc = await Course.findById(course._id);
      expect(courseDoc).not.toBeNull();

      // Cascade cleanup is expected to null the ref (not leave a dangling
      // ObjectId). The downstream observable — populate('instructor')
      // resolving to null — is the same either way, but the stored value
      // is now clean.
      expect(courseDoc.instructor).toBeNull();

      const populated = await courseDoc.populate('instructor');
      expect(populated.instructor).toBeNull();
    });

    it('removes the instructor doc and clears Track.instructor (cascade cleanup present)', async () => {
      const { instructor, track } = await buildTrackAndCourseFixture();

      const res = await request(app)
        .delete(`/v1/users/${instructor._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(204);

      const trackDoc = await Track.findById(track._id);
      expect(trackDoc).not.toBeNull();
      expect(trackDoc.instructor).toBeNull();
    });

    // -------------------------------------------------------------------
    // Student-side: cascade cleanup is MISSING. These tests document the
    // actual (dangling) behaviour and should start failing once the gap
    // is closed.
    // -------------------------------------------------------------------

    it('removes the student doc but leaves them in Course.students (cleanup MISSING)', async () => {
      const { student, course } = await buildTrackAndCourseFixture();

      await request(app)
        .delete(`/v1/users/${student._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const courseDoc = await Course.findById(course._id);
      expect(courseDoc.students.map((id) => id.toString())).toContain(
        student._id.toString(),
      );
    });

    it('removes the student doc but leaves their Assignment.submissions entry intact (cleanup MISSING)', async () => {
      const { instructor, course, student } =
        await buildTrackAndCourseFixture();

      const assignment = await Assignment.create({
        title: 'Assignment 1',
        description: 'desc',
        course: course._id,
        instructor: instructor._id,
        deadline: new Date(Date.now() + 86400000),
        submissions: [
          {
            student: student._id,
            file: 'https://drive.google.com/file/d/abc',
          },
        ],
      });

      await request(app)
        .delete(`/v1/users/${student._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const orphanedAssignment = await Assignment.findById(assignment._id);
      expect(orphanedAssignment.submissions).toHaveLength(1);
      expect(orphanedAssignment.submissions[0].student.toString()).toBe(
        student._id.toString(),
      );
    });

    it('removes the reviewer doc but leaves their Review.user ref dangling (cleanup MISSING)', async () => {
      const { course, student } = await buildTrackAndCourseFixture();

      const review = await Review.create({
        user: student._id,
        course: course._id,
        rating: 5,
        content: 'Great course!',
      });

      await request(app)
        .delete(`/v1/users/${student._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const orphanedReview = await Review.findById(review._id);
      expect(orphanedReview).not.toBeNull();
      expect(orphanedReview.user.toString()).toBe(student._id.toString());

      const populated = await orphanedReview.populate('user');
      expect(populated.user).toBeNull();
    });
  });

  describe("POST /v1/users/bulk { action: 'delete' } (admin bulk hard delete)", () => {
    it('removes the student doc but leaves dangling Course.students refs, same as single delete (cleanup MISSING)', async () => {
      const { course, student } = await buildTrackAndCourseFixture();

      const res = await request(app)
        .post('/v1/users/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userIds: [student._id.toString()], action: 'delete' });
      expect(res.status).toBe(200);

      const courseDoc = await Course.findById(course._id);
      expect(courseDoc.students.map((id) => id.toString())).toContain(
        student._id.toString(),
      );
    });
  });
});
