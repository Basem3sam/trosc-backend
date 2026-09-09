const mongoose = require('mongoose');
const enrollmentService = require('../../src/services/enrollment.service');
const Track = require('../../src/models/track.model');
const Course = require('../../src/models/course.model');
const Session = require('../../src/models/session.model');
const User = require('../../src/models/user.model');
const { createTestUser } = require('../helpers/testUser');

describe('Enrollment Service', () => {
  let instructor, student, student2;

  beforeEach(async () => {
    instructor = (await createTestUser({ role: 'instructor' })).user;
    student = (await createTestUser({ role: 'student' })).user;
    student2 = (await createTestUser({ role: 'student' })).user;
  });

  // Helper to get string IDs
  const sId = (user) => user._id.toString();

  describe('enrollStudentInTrack', () => {
    it('enrolls a student in a track', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
      });
      const updated = await enrollmentService.enrollStudentInTrack(
        track._id,
        sId(student),
      );
      expect(updated.students.map((id) => id.toString())).toContain(
        sId(student),
      );
      const user = await User.findById(student._id);
      expect(user.enrolledTrack.toString()).toBe(track._id.toString());
    });

    it('throws 400 if student already enrolled', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
        students: [student._id],
      });
      await expect(
        enrollmentService.enrollStudentInTrack(track._id, sId(student)),
      ).rejects.toThrow('Student is already enrolled');
    });
  });

  describe('removeStudentFromTrack', () => {
    it('removes a student', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
        students: [student._id],
      });
      const updated = await enrollmentService.removeStudentFromTrack(
        track._id,
        sId(student),
      );
      expect(updated.students.map((id) => id.toString())).not.toContain(
        sId(student),
      );
      const user = await User.findById(student._id);
      expect(user.enrolledTrack).toBeNull();
    });

    it('throws 400 if student not enrolled', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
      });
      await expect(
        enrollmentService.removeStudentFromTrack(track._id, sId(student)),
      ).rejects.toThrow('Student is not enrolled');
    });
  });

  describe('enrollMeInTrack', () => {
    it('adds student to pending list if published and not already enrolled/pending', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
        published: true,
      });
      const updated = await enrollmentService.enrollMeInTrack(
        track._id,
        sId(student),
      );
      expect(updated.pendingStudents.map((id) => id.toString())).toContain(
        sId(student),
      );
    });

    it('throws 400 if track not published', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
        published: false,
      });
      await expect(
        enrollmentService.enrollMeInTrack(track._id, sId(student)),
      ).rejects.toThrow('This track is not open for enrollment');
    });

    it('throws 400 if student already enrolled', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
        published: true,
        students: [student._id],
      });
      await expect(
        enrollmentService.enrollMeInTrack(track._id, sId(student)),
      ).rejects.toThrow('You are already enrolled in this track');
    });

    it('throws 400 if student already pending', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
        published: true,
        pendingStudents: [student._id],
      });
      await expect(
        enrollmentService.enrollMeInTrack(track._id, sId(student)),
      ).rejects.toThrow('Your application is already pending approval');
    });

    it('throws 400 if student is in another track (enrolledTrack exists)', async () => {
      const otherTrack = await Track.create({
        title: 'Other',
        description: 'test',
        instructor: instructor._id,
        students: [student._id],
      });
      await User.findByIdAndUpdate(student._id, {
        enrolledTrack: otherTrack._id,
      });
      const track = await Track.create({
        title: 'New',
        description: 'test',
        instructor: instructor._id,
        published: true,
      });
      await expect(
        enrollmentService.enrollMeInTrack(track._id, sId(student)),
      ).rejects.toThrow('You can only apply to one track at a time');
    });

    it('throws 400 if student is pending in another track', async () => {
      const otherTrack = await Track.create({
        title: 'Other',
        description: 'test',
        instructor: instructor._id,
        pendingStudents: [student._id],
      });
      const track = await Track.create({
        title: 'New',
        description: 'test',
        instructor: instructor._id,
        published: true,
      });
      await expect(
        enrollmentService.enrollMeInTrack(track._id, sId(student)),
      ).rejects.toThrow('You can only apply to one track at a time');
    });
  });

  describe('approveStudentInTrack', () => {
    it('approves pending student', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
        pendingStudents: [student._id],
      });
      const updated = await enrollmentService.approveStudentInTrack(
        track._id,
        sId(student),
      );
      expect(updated.students.map((id) => id.toString())).toContain(
        sId(student),
      );
      expect(updated.pendingStudents.map((id) => id.toString())).not.toContain(
        sId(student),
      );
      const user = await User.findById(student._id);
      expect(user.enrolledTrack.toString()).toBe(track._id.toString());
    });

    it('throws 400 if student not pending', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
      });
      await expect(
        enrollmentService.approveStudentInTrack(track._id, sId(student)),
      ).rejects.toThrow('Student is not pending in this track');
    });

    it('throws 400 if student already enrolled in another track', async () => {
      const otherTrack = await Track.create({
        title: 'Other',
        description: 'test',
        instructor: instructor._id,
        students: [student._id],
      });
      await User.findByIdAndUpdate(student._id, {
        enrolledTrack: otherTrack._id,
      });
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
        pendingStudents: [student._id],
      });
      await expect(
        enrollmentService.approveStudentInTrack(track._id, sId(student)),
      ).rejects.toThrow('Student is already enrolled in another track');
    });
  });

  describe('rejectStudentInTrack', () => {
    it('rejects pending student', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
        pendingStudents: [student._id],
      });
      const updated = await enrollmentService.rejectStudentInTrack(
        track._id,
        sId(student),
      );
      expect(updated.pendingStudents.map((id) => id.toString())).not.toContain(
        sId(student),
      );
    });
  });

  describe('requestLeaveTrack / approveLeaveTrack / rejectLeaveTrack', () => {
    it('request adds to pendingLeaves', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
        students: [student._id],
      });
      const updated = await enrollmentService.requestLeaveTrack(
        track._id,
        sId(student),
      );
      expect(updated.pendingLeaves.map((id) => id.toString())).toContain(
        sId(student),
      );
    });

    it('approveLeaveTrack removes student and clears pending', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
        students: [student._id],
        pendingLeaves: [student._id],
      });
      const updated = await enrollmentService.approveLeaveTrack(
        track._id,
        sId(student),
      );
      expect(updated.students.map((id) => id.toString())).not.toContain(
        sId(student),
      );
      expect(updated.pendingLeaves.map((id) => id.toString())).not.toContain(
        sId(student),
      );
      const user = await User.findById(student._id);
      expect(user.enrolledTrack).toBeNull();
    });

    it('rejectLeaveTrack clears pending but keeps student', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
        students: [student._id],
        pendingLeaves: [student._id],
      });
      const updated = await enrollmentService.rejectLeaveTrack(
        track._id,
        sId(student),
      );
      expect(updated.pendingLeaves.map((id) => id.toString())).not.toContain(
        sId(student),
      );
      expect(updated.students.map((id) => id.toString())).toContain(
        sId(student),
      );
    });

    it('throws 400 if not enrolled for requestLeave', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
      });
      await expect(
        enrollmentService.requestLeaveTrack(track._id, sId(student)),
      ).rejects.toThrow('You are not enrolled in this track');
    });

    it('throws 400 if already pending leave', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
        students: [student._id],
        pendingLeaves: [student._id],
      });
      await expect(
        enrollmentService.requestLeaveTrack(track._id, sId(student)),
      ).rejects.toThrow('Your leave request is already pending');
    });

    it('throws 400 if no pending leave for approve/reject', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
        students: [student._id],
      });
      await expect(
        enrollmentService.approveLeaveTrack(track._id, sId(student)),
      ).rejects.toThrow('No pending leave request found');
      await expect(
        enrollmentService.rejectLeaveTrack(track._id, sId(student)),
      ).rejects.toThrow('No pending leave request found');
    });
  });

  describe('getPendingStudents / getPendingLeaves', () => {
    it('returns pending students', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
        pendingStudents: [student._id],
      });
      const pending = await enrollmentService.getPendingStudents(track._id);
      expect(pending).toHaveLength(1);
      expect(pending[0]._id.toString()).toBe(sId(student));
    });

    it('returns pending leaves', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
        pendingLeaves: [student._id],
      });
      const pending = await enrollmentService.getPendingLeaves(track._id);
      expect(pending).toHaveLength(1);
      expect(pending[0]._id.toString()).toBe(sId(student));
    });
  });

  describe('enrollInCourse', () => {
    it('enrolls student in public course', async () => {
      const course = await Course.create({
        title: 'Course',
        description: 'test',
        instructor: instructor._id,
        access: 'public',
        published: true,
      });
      const updated = await enrollmentService.enrollInCourse(
        sId(student),
        course._id,
      );
      expect(updated.students.map((id) => id.toString())).toContain(
        sId(student),
      );
      const user = await User.findById(student._id);
      expect(user.enrolledCourses.map((id) => id.toString())).toContain(
        course._id.toString(),
      );
    });

    it('throws 403 if course access = private', async () => {
      const course = await Course.create({
        title: 'Private',
        description: 'test',
        instructor: instructor._id,
        access: 'private',
        published: true,
      });
      await expect(
        enrollmentService.enrollInCourse(sId(student), course._id),
      ).rejects.toThrow('requires instructor approval');
    });

    it('throws 403 if track-only and student not in track', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
      });
      const course = await Course.create({
        title: 'TrackOnly',
        description: 'test',
        instructor: instructor._id,
        track: track._id,
        access: 'track-only',
        published: true,
      });
      await expect(
        enrollmentService.enrollInCourse(sId(student), course._id),
      ).rejects.toThrow('You must be enrolled in the parent track');
    });

    it('allows track-only if student is in track', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
        students: [student._id],
      });
      const course = await Course.create({
        title: 'TrackOnly',
        description: 'test',
        instructor: instructor._id,
        track: track._id,
        access: 'track-only',
        published: true,
      });
      const updated = await enrollmentService.enrollInCourse(
        sId(student),
        course._id,
      );
      expect(updated.students.map((id) => id.toString())).toContain(
        sId(student),
      );
    });

    it('throws 403 if prerequisites not met', async () => {
      const prereq = await Course.create({
        title: 'Prereq',
        description: 'test',
        instructor: instructor._id,
        published: true,
      });
      const course = await Course.create({
        title: 'Advanced',
        description: 'test',
        instructor: instructor._id,
        prerequisites: [prereq._id],
        access: 'public',
        published: true,
      });
      await expect(
        enrollmentService.enrollInCourse(sId(student), course._id),
      ).rejects.toThrow('prerequisites');
    });

    it('allows enrollment if prerequisites met', async () => {
      const prereq = await Course.create({
        title: 'Prereq',
        description: 'test',
        instructor: instructor._id,
        students: [student._id],
        published: true,
      });
      await User.findByIdAndUpdate(student._id, {
        $addToSet: { enrolledCourses: prereq._id },
      });
      const course = await Course.create({
        title: 'Advanced',
        description: 'test',
        instructor: instructor._id,
        prerequisites: [prereq._id],
        access: 'public',
        published: true,
      });
      const updated = await enrollmentService.enrollInCourse(
        sId(student),
        course._id,
      );
      expect(updated.students.map((id) => id.toString())).toContain(
        sId(student),
      );
    });
  });

  describe('leaveCourse', () => {
    it('removes student from course', async () => {
      const course = await Course.create({
        title: 'Course',
        description: 'test',
        instructor: instructor._id,
        students: [student._id],
        published: true,
      });
      const updated = await enrollmentService.leaveCourse(
        sId(student),
        course._id,
      );
      expect(updated.students.map((id) => id.toString())).not.toContain(
        sId(student),
      );
      const user = await User.findById(student._id);
      expect(user.enrolledCourses.map((id) => id.toString())).not.toContain(
        course._id.toString(),
      );
    });

    it('throws 400 if not enrolled', async () => {
      const course = await Course.create({
        title: 'Course',
        description: 'test',
        instructor: instructor._id,
        published: true,
      });
      await expect(
        enrollmentService.leaveCourse(sId(student), course._id),
      ).rejects.toThrow('You are not enrolled in this course');
    });
  });

  describe('enrollInSession / leaveSession', () => {
    it('enrolls in session with access=public', async () => {
      const session = await Session.create({
        title: 'Session',
        instructor: instructor._id,
        access: 'public',
        published: true,
      });
      const updated = await enrollmentService.enrollInSession(
        sId(student),
        session._id,
      );
      expect(updated.students.map((id) => id.toString())).toContain(
        sId(student),
      );
      const user = await User.findById(student._id);
      expect(user.enrolledSessions.map((id) => id.toString())).toContain(
        session._id.toString(),
      );
    });

    it('throws 403 if private', async () => {
      const session = await Session.create({
        title: 'Private',
        instructor: instructor._id,
        access: 'private',
        published: true,
      });
      await expect(
        enrollmentService.enrollInSession(sId(student), session._id),
      ).rejects.toThrow('requires instructor approval');
    });

    it('throws 403 if track-only and not in track or course', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
      });
      const session = await Session.create({
        title: 'TrackOnly',
        instructor: instructor._id,
        tracks: [track._id],
        access: 'track-only',
        published: true,
      });
      await expect(
        enrollmentService.enrollInSession(sId(student), session._id),
      ).rejects.toThrow('You must be enrolled in the parent track or course');
    });

    it('allows track-only if student in track', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
        students: [student._id],
      });
      const session = await Session.create({
        title: 'TrackOnly',
        instructor: instructor._id,
        tracks: [track._id],
        access: 'track-only',
        published: true,
      });
      const updated = await enrollmentService.enrollInSession(
        sId(student),
        session._id,
      );
      expect(updated.students.map((id) => id.toString())).toContain(
        sId(student),
      );
    });

    it('allows track-only if student in course (which has the session)', async () => {
      const course = await Course.create({
        title: 'Course',
        description: 'test',
        instructor: instructor._id,
        students: [student._id],
        published: true,
      });
      const session = await Session.create({
        title: 'TrackOnly',
        instructor: instructor._id,
        course: course._id,
        access: 'track-only',
        published: true,
      });
      const updated = await enrollmentService.enrollInSession(
        sId(student),
        session._id,
      );
      expect(updated.students.map((id) => id.toString())).toContain(
        sId(student),
      );
    });

    it('leaveSession removes student', async () => {
      const session = await Session.create({
        title: 'Session',
        instructor: instructor._id,
        students: [student._id],
        published: true,
      });
      const updated = await enrollmentService.leaveSession(
        sId(student),
        session._id,
      );
      expect(updated.students.map((id) => id.toString())).not.toContain(
        sId(student),
      );
      const user = await User.findById(student._id);
      expect(user.enrolledSessions.map((id) => id.toString())).not.toContain(
        session._id.toString(),
      );
    });

    it('throws 400 if not enrolled', async () => {
      const session = await Session.create({
        title: 'Session',
        instructor: instructor._id,
        published: true,
      });
      await expect(
        enrollmentService.leaveSession(sId(student), session._id),
      ).rejects.toThrow('You are not enrolled in this session');
    });
  });
});
