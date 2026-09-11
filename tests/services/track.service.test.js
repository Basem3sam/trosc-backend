const mongoose = require('mongoose');
const trackService = require('../../src/services/track.service');
const Track = require('../../src/models/track.model');
const Course = require('../../src/models/course.model');
const Session = require('../../src/models/session.model');
const Assignment = require('../../src/models/assignment.model');
const Review = require('../../src/models/review.model');
const WeeklyTask = require('../../src/models/weeklytask.model');
const User = require('../../src/models/user.model');
const { createTestUser } = require('../helpers/testUser');

describe('Track Service (Edge Cases & Transactions)', () => {
  let instructor;
  let student1;
  let student2;

  beforeEach(async () => {
    instructor = (await createTestUser({ role: 'instructor' })).user;
    student1 = (await createTestUser({ role: 'student' })).user;
    student2 = (await createTestUser({ role: 'student' })).user;
  });

  describe('deleteTrack', () => {
    it('cascades correctly: deletes assignments, reviews, weekly tasks, orphans courses, updates sessions', async () => {
      // 1. Build a track with a course, a session, and two students
      const track = await Track.create({
        title: 'Cascade Test Track',
        description: 'For testing delete cascades',
        instructor: instructor._id,
        students: [student1._id, student2._id],
      });

      const course = await Course.create({
        title: 'Cascade Course',
        description: 'Inside track',
        instructor: instructor._id,
        track: track._id,
        students: [student1._id, student2._id],
      });

      const session = await Session.create({
        title: 'Cascade Session',
        instructor: instructor._id,
        tracks: [track._id],
        students: [student1._id, student2._id],
        course: course._id,
      });

      // Add course and session to track's arrays
      track.courses.push(course._id);
      track.sessions.push(session._id);
      course.sessions.push(session._id);
      await track.save();
      await course.save();

      // 2. Create an assignment (attached to the course)
      const assignment = await Assignment.create({
        title: 'Cascade Assignment',
        description: 'Will be deleted',
        instructor: instructor._id,
        course: course._id,
        deadline: new Date(),
        submissions: [
          { student: student1._id, file: 'https://drive.google.com/file' },
        ],
      });

      // 3. Create a review (attached to the track)
      const review = await Review.create({
        user: student1._id,
        track: track._id,
        rating: 5,
        content: 'Great track!',
      });

      // 4. Create a weekly task (attached to the course) WITHOUT completions first
      const weeklyTask = await WeeklyTask.create({
        course: course._id,
        instructor: instructor._id,
        week: 1,
        title: 'Week 1',
        items: [{ title: 'Read something' }],
      });

      // Now retrieve the generated item _id and push a completion
      const itemId = weeklyTask.items[0]._id;
      await WeeklyTask.updateOne(
        { _id: weeklyTask._id },
        { $push: { completions: { student: student1._id, item: itemId } } },
      );

      // 5. Execute deleteTrack
      await trackService.deleteTrack(track._id);

      // 6. Assertions
      // Track is gone
      expect(await Track.findById(track._id)).toBeNull();

      // Course still exists but track is null
      const orphanedCourse = await Course.findById(course._id);
      expect(orphanedCourse).not.toBeNull();
      expect(orphanedCourse.track).toBeNull();
      expect(orphanedCourse.students.map((id) => id.toString())).not.toContain(
        student1._id.toString(),
      );
      expect(orphanedCourse.students.map((id) => id.toString())).not.toContain(
        student2._id.toString(),
      );

      // Session still exists, track removed, course still set (but course now has no track)
      const orphanedSession = await Session.findById(session._id);
      expect(orphanedSession).not.toBeNull();
      expect(orphanedSession.tracks.map((id) => id.toString())).not.toContain(
        track._id.toString(),
      );
      // Since session had a course, isStandalone should be false
      expect(orphanedSession.isStandalone).toBe(false);
      expect(orphanedSession.students.map((id) => id.toString())).not.toContain(
        student1._id.toString(),
      );
      expect(orphanedSession.students.map((id) => id.toString())).not.toContain(
        student2._id.toString(),
      );

      // Assignment deleted
      expect(await Assignment.findById(assignment._id)).toBeNull();

      // Review deleted
      expect(await Review.findById(review._id)).toBeNull();

      // Weekly Task deleted
      expect(await WeeklyTask.findById(weeklyTask._id)).toBeNull();

      // User enrollments cleaned up
      const u1 = await User.findById(student1._id);
      const u2 = await User.findById(student2._id);
      expect(u1.enrolledTrack).toBeNull();
      expect(u1.enrolledCourses.map((id) => id.toString())).not.toContain(
        course._id.toString(),
      );
      expect(u1.enrolledSessions.map((id) => id.toString())).not.toContain(
        session._id.toString(),
      );
      expect(u2.enrolledTrack).toBeNull();
      expect(u2.enrolledCourses.map((id) => id.toString())).not.toContain(
        course._id.toString(),
      );
      expect(u2.enrolledSessions.map((id) => id.toString())).not.toContain(
        session._id.toString(),
      );
    });

    it('throws 404 if track not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(trackService.deleteTrack(fakeId)).rejects.toThrow(
        'No track found',
      );
    });

    it('rejects if removing last course would leave track empty (via updateTrack)', async () => {
      const track = await Track.create({
        title: 'Single Course Track',
        description: 'Only one course',
        instructor: instructor._id,
      });
      const course = await Course.create({
        title: 'Only Course',
        description: 'Inside track',
        instructor: instructor._id,
        track: track._id,
      });
      track.courses.push(course._id);
      await track.save();

      // Try to remove the only course via updateTrack – expectation matches actual error message
      await expect(
        trackService.updateTrack(track._id, { courses: [] }),
      ).rejects.toThrow('A track must have at least one course or one session');
    });
  });
});
