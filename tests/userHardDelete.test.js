const request = require('supertest');
const app = require('../src/app');
const Track = require('../src/models/track.model');
const Course = require('../src/models/course.model');
const Assignment = require('../src/models/assignment.model');
const Review = require('../src/models/review.model');
const User = require('../src/models/user.model');
const { createTestUser } = require('./helpers/testUser');
const { buildTrackAndCourseFixture } = require('./helpers/fixtures');

// ===========================================================================
// HARD-DELETE BEHAVIOR
//
// deleteMe (self-service) soft-deletes (`active: false`). deleteUser
// (admin) and bulkUserAction('delete') hard-delete via
// cascade.service.js#hardDeleteUserCascade, which:
//
//   1. REFUSES (409) if the user is the required instructor/creator of any
//      Course, Track, Event, or Announcement. Those refs are `required` in
//      their schemas, so a cascade can't legally null them out — the caller
//      must reassign the content first.
//
//   2. CLEANS UP student-side references atomically in a transaction:
//      Course.students, Track.students, Assignment.submissions,
//      WeeklyTask.completions, Event.attendees — and DELETES any Reviews
//      authored by the user (Review.user is required, and a review has no
//      standalone meaning without its author).
//
// NOTE on assertions below: Course and Track both register a
// `pre(/^find/)` populate hook on `instructor` (see course.model.js and
// track.model.js). That hook fires on *every* find* query, including
// findById — so `courseDoc.instructor` from a normal Mongoose read is a
// full populated document, not an ObjectId. To assert on the *stored*
// reference (which is what "was the ref mutated?" is really asking),
// the tests below read via `Model.collection.findOne`, the driver-level
// collection, which bypasses Mongoose middleware entirely.
// ===========================================================================

describe('User hard-delete', () => {
  let adminToken;

  beforeEach(async () => {
    const admin = await createTestUser({ role: 'admin' });
    adminToken = admin.token;
  });

  describe('DELETE /v1/users/:id (admin hard delete)', () => {
    // -------------------------------------------------------------------
    // Instructor-side: blocked with 409 when the user owns required
    // content. Nothing is mutated — the caller must reassign first.
    // -------------------------------------------------------------------

    it('refuses (409) to delete an instructor who owns a Course', async () => {
      const { instructor, course } = await buildTrackAndCourseFixture();

      const res = await request(app)
        .delete(`/v1/users/${instructor._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/required instructor\/creator/i);

      // User still exists.
      expect(await User.findById(instructor._id)).not.toBeNull();

      // Read via the raw collection to bypass Course's pre(/^find/)
      // populate hook — we want to assert on the *stored* reference,
      // not the populated view that hook produces.
      const stored = await Course.collection.findOne({ _id: course._id });
      expect(stored).not.toBeNull();
      expect(stored.instructor.toString()).toBe(instructor._id.toString());
    });

    it('refuses (409) to delete an instructor who owns a Track', async () => {
      const { instructor, track } = await buildTrackAndCourseFixture();

      const res = await request(app)
        .delete(`/v1/users/${instructor._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);

      expect(await User.findById(instructor._id)).not.toBeNull();

      // Same reasoning as the Course test above — Track also registers a
      // pre(/^find/) populate hook on `instructor`.
      const stored = await Track.collection.findOne({ _id: track._id });
      expect(stored).not.toBeNull();
      expect(stored.instructor.toString()).toBe(instructor._id.toString());
    });

    // -------------------------------------------------------------------
    // Student-side: hard delete succeeds and cleans up every reference
    // atomically.
    // -------------------------------------------------------------------

    it('removes the student and pulls them out of Course.students', async () => {
      const { student, course } = await buildTrackAndCourseFixture();

      const res = await request(app)
        .delete(`/v1/users/${student._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(204);

      expect(await User.findById(student._id)).toBeNull();
      const courseDoc = await Course.findById(course._id);
      expect(courseDoc.students.map((id) => id.toString())).not.toContain(
        student._id.toString(),
      );
    });

    it('removes the student and pulls their Assignment submissions', async () => {
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

      const updated = await Assignment.findById(assignment._id);
      expect(updated.submissions).toHaveLength(0);
    });

    it('removes the student and deletes any Reviews they authored', async () => {
      const { course, student } = await buildTrackAndCourseFixture();

      const review = await Review.create({
        user: student._id,
        course: course._id,
        rating: 5,
        content: 'Great course!',
      });

      const res = await request(app)
        .delete(`/v1/users/${student._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(204);

      // Review.user is required and a review has no standalone meaning
      // without its author — so it's deleted, not orphaned.
      expect(await Review.findById(review._id)).toBeNull();
    });
  });

  describe("POST /v1/users/bulk { action: 'delete' } (admin bulk hard delete)", () => {
    it('cleans up Course.students refs the same way as single delete', async () => {
      const { course, student } = await buildTrackAndCourseFixture();

      const res = await request(app)
        .post('/v1/users/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userIds: [student._id.toString()], action: 'delete' });
      expect(res.status).toBe(200);

      expect(await User.findById(student._id)).toBeNull();
      const courseDoc = await Course.findById(course._id);
      expect(courseDoc.students.map((id) => id.toString())).not.toContain(
        student._id.toString(),
      );
    });
  });
});
