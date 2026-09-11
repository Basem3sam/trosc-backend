const mongoose = require('mongoose');
const sessionService = require('../../src/services/session.service');
const Track = require('../../src/models/track.model');
const Course = require('../../src/models/course.model');
const Session = require('../../src/models/session.model');
const User = require('../../src/models/user.model');
const { createTestUser } = require('../helpers/testUser');

// Helper to get string representation of ObjectId
const sId = (user) => user._id.toString();

describe('Session Service', () => {
  let instructor;
  let student;
  let otherInstructor;

  beforeEach(async () => {
    instructor = (await createTestUser({ role: 'instructor' })).user;
    otherInstructor = (await createTestUser({ role: 'instructor' })).user;
    student = (await createTestUser({ role: 'student' })).user;
  });

  describe('createSession', () => {
    it('creates a session', async () => {
      const data = {
        title: 'Service Session',
        description: 'test',
        instructor: instructor._id,
      };
      const session = await sessionService.createSession(data);
      expect(session.title).toBe('Service Session');
    });
  });

  describe('getAllSessions', () => {
    it('returns paginated sessions and strips sensitive fields', async () => {
      const session = await Session.create({
        title: 'Test',
        instructor: instructor._id,
        url: 'https://drive.google.com/file/d/abc', // trusted host
        resources: [
          { title: 'res', url: 'https://drive.google.com/file/d/xyz' },
        ],
        published: true,
      });
      const result = await sessionService.getAllSessions({});
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].url).toBeUndefined();
      expect(result.sessions[0].embedUrl).toBeUndefined();
      expect(result.sessions[0].resources).toBeUndefined();
    });
  });

  describe('getSessionById', () => {
    it('returns session with embedUrl for YouTube when user is owner', async () => {
      const session = await Session.create({
        title: 'YouTube',
        instructor: instructor._id,
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        published: true,
      });
      const result = await sessionService.getSessionById(session._id, {
        id: sId(instructor),
        role: 'instructor',
      });
      expect(result.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    });

    it('strips url/embedUrl/resources for non-enrolled outsider', async () => {
      const session = await Session.create({
        title: 'Private',
        instructor: instructor._id,
        url: 'https://drive.google.com/file/d/abc',
        resources: [
          { title: 'res', url: 'https://drive.google.com/file/d/xyz' },
        ],
        students: [student._id],
        published: true,
      });
      const outsider = (await createTestUser({ role: 'student' })).user;
      const result = await sessionService.getSessionById(session._id, {
        id: sId(outsider),
        role: 'student',
      });
      expect(result.url).toBeUndefined();
      expect(result.embedUrl).toBeUndefined();
      expect(result.resources).toBeUndefined();
    });

    it('keeps url/embedUrl/resources for enrolled student, owner, admin', async () => {
      const session = await Session.create({
        title: 'Private',
        instructor: instructor._id,
        url: 'https://drive.google.com/file/d/abc',
        resources: [
          { title: 'res', url: 'https://drive.google.com/file/d/xyz' },
        ],
        students: [student._id],
        published: true,
      });

      // Enrolled student
      const resultStudent = await sessionService.getSessionById(session._id, {
        id: sId(student),
        role: 'student',
      });
      expect(resultStudent.url).toBeDefined();

      // Owner instructor
      const resultOwner = await sessionService.getSessionById(session._id, {
        id: sId(instructor),
        role: 'instructor',
      });
      expect(resultOwner.url).toBeDefined();

      // Admin
      const admin = (await createTestUser({ role: 'admin' })).user;
      const resultAdmin = await sessionService.getSessionById(session._id, {
        id: sId(admin),
        role: 'admin',
      });
      expect(resultAdmin.url).toBeDefined();
    });

    it('finds enrollment via parent track or course', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
        students: [student._id],
      });
      const session = await Session.create({
        title: 'Track Session',
        instructor: instructor._id,
        tracks: [track._id],
        url: 'https://drive.google.com/file/d/abc',
        published: true,
      });
      const result = await sessionService.getSessionById(session._id, {
        id: sId(student),
        role: 'student',
      });
      expect(result.url).toBeDefined();

      // Also via course
      const course = await Course.create({
        title: 'Course',
        description: 'test',
        instructor: instructor._id,
        students: [student._id],
        published: true,
      });
      const session2 = await Session.create({
        title: 'Course Session',
        instructor: instructor._id,
        course: course._id,
        url: 'https://drive.google.com/file/d/abc',
        published: true,
      });
      const result2 = await sessionService.getSessionById(session2._id, {
        id: sId(student),
        role: 'student',
      });
      expect(result2.url).toBeDefined();
    });
  });

  describe('updateSession', () => {
    it('updates session fields', async () => {
      const session = await Session.create({
        title: 'Old',
        instructor: instructor._id,
        published: true,
      });
      const updated = await sessionService.updateSession(session._id, {
        title: 'New',
        description: 'updated desc',
      });
      expect(updated.title).toBe('New');
      expect(updated.description).toBe('updated desc');
    });
  });

  describe('deleteSession', () => {
    it('deletes session and removes from tracks/courses and user enrollments', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
      });
      const course = await Course.create({
        title: 'Course',
        description: 'test',
        instructor: instructor._id,
      });
      const session = await Session.create({
        title: 'Session',
        instructor: instructor._id,
        tracks: [track._id],
        course: course._id,
        students: [student._id],
        published: true,
      });
      track.sessions.push(session._id);
      course.sessions.push(session._id);
      await track.save();
      await course.save();

      await sessionService.deleteSession(session._id);

      const updatedTrack = await Track.findById(track._id);
      expect(updatedTrack.sessions.map((id) => id.toString())).not.toContain(
        session._id.toString(),
      );
      const updatedCourse = await Course.findById(course._id);
      expect(updatedCourse.sessions.map((id) => id.toString())).not.toContain(
        session._id.toString(),
      );
      const user = await User.findById(student._id);
      expect(user.enrolledSessions.map((id) => id.toString())).not.toContain(
        session._id.toString(),
      );
    });
  });

  describe('addStudentToSession / removeStudentFromSession', () => {
    it('adds a student', async () => {
      const session = await Session.create({
        title: 'Session',
        instructor: instructor._id,
        published: true,
      });
      const updated = await sessionService.addStudentToSession(
        session._id,
        sId(student),
      );
      // Check that the student ID appears in the populated students list
      const studentIds = updated.students.map((s) => s._id.toString());
      expect(studentIds).toContain(sId(student));
      const user = await User.findById(student._id);
      expect(user.enrolledSessions.map((id) => id.toString())).toContain(
        session._id.toString(),
      );
    });

    it('throws 400 if student already enrolled', async () => {
      const session = await Session.create({
        title: 'Session',
        instructor: instructor._id,
        students: [student._id],
        published: true,
      });
      await expect(
        sessionService.addStudentToSession(session._id, sId(student)),
      ).rejects.toThrow('Student is already enrolled');
    });

    it('removes a student', async () => {
      const session = await Session.create({
        title: 'Session',
        instructor: instructor._id,
        students: [student._id],
        published: true,
      });
      const updated = await sessionService.removeStudentFromSession(
        session._id,
        sId(student),
      );
      expect(updated.students.map((id) => id.toString())).not.toContain(
        sId(student),
      );
      const user = await User.findById(student._id);
      expect(user.enrolledSessions.map((id) => id.toString())).not.toContain(
        session._id.toString(),
      );
    });

    it('throws 400 if student not enrolled', async () => {
      const session = await Session.create({
        title: 'Session',
        instructor: instructor._id,
        published: true,
      });
      await expect(
        sessionService.removeStudentFromSession(session._id, sId(student)),
      ).rejects.toThrow('Student is not enrolled');
    });
  });

  describe('getSessionsByInstructor / getSessionsByTrack / getSessionsByStudent', () => {
    it('filters by instructor', async () => {
      await Session.create([
        { title: 'A', instructor: instructor._id, published: true },
        { title: 'B', instructor: otherInstructor._id, published: true },
      ]);
      const result = await sessionService.getSessionsByInstructor(
        sId(instructor),
        {},
      );
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].instructor._id.toString()).toBe(
        sId(instructor),
      );
    });

    it('filters by track', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
      });
      const session = await Session.create({
        title: 'Session',
        instructor: instructor._id,
        tracks: [track._id],
        published: true,
      });
      const result = await sessionService.getSessionsByTrack(sId(track), {});
      expect(result.sessions).toHaveLength(1);
    });

    it('filters by student', async () => {
      const session = await Session.create({
        title: 'Session',
        instructor: instructor._id,
        students: [student._id],
        published: true,
      });
      const result = await sessionService.getSessionsByStudent(
        sId(student),
        {},
      );
      expect(result.sessions).toHaveLength(1);
    });
  });
});
