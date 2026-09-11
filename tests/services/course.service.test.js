const mongoose = require('mongoose');
const courseService = require('../../src/services/course.service');
const Track = require('../../src/models/track.model');
const Course = require('../../src/models/course.model');
const Session = require('../../src/models/session.model');
const Assignment = require('../../src/models/assignment.model');
const Review = require('../../src/models/review.model');
const WeeklyTask = require('../../src/models/weeklytask.model');
const User = require('../../src/models/user.model');
const { createTestUser } = require('../helpers/testUser');

// Helper to get string representation of ObjectId
const sId = (user) => user._id.toString();

describe('Course Service', () => {
  let instructor;
  let student;
  let otherInstructor;

  beforeEach(async () => {
    instructor = (await createTestUser({ role: 'instructor' })).user;
    otherInstructor = (await createTestUser({ role: 'instructor' })).user;
    student = (await createTestUser({ role: 'student' })).user;
  });

  describe('createCourse', () => {
    it('creates a course with valid data', async () => {
      const data = {
        title: 'Service Course',
        description: 'Created by service',
        instructor: instructor._id,
      };
      const course = await courseService.createCourse(data);
      expect(course.title).toBe('Service Course');
      expect(course.instructor._id.toString()).toBe(sId(instructor));
    });
  });

  describe('getAllCourses', () => {
    it('returns paginated courses', async () => {
      await Course.create([
        { title: 'AAA', description: '1', instructor: instructor._id },
        { title: 'BBB', description: '2', instructor: instructor._id },
      ]);
      const result = await courseService.getAllCourses({ limit: 1, page: 1 });
      expect(result.courses).toHaveLength(1);
      expect(result.total).toBe(2);
    });
  });

  describe('getCourseById', () => {
    it('returns course with populated sessions when requested', async () => {
      const course = await Course.create({
        title: 'Service Course',
        description: 'test',
        instructor: instructor._id,
      });
      const session = await Session.create({
        title: 'Service Session',
        instructor: instructor._id,
        course: course._id,
        published: true,
      });
      course.sessions.push(session._id);
      await course.save();

      const found = await courseService.getCourseById(course._id, true);
      expect(found.sessions).toHaveLength(1);
      expect(found.sessions[0]._id.toString()).toBe(session._id.toString());
    });
  });

  describe('getCourseDetails', () => {
    it('throws 404 if course not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(courseService.getCourseDetails(fakeId)).rejects.toThrow(
        'No course found',
      );
    });

    it('returns course with students if user is owner, admin, or enrolled', async () => {
      const course = await Course.create({
        title: 'Private Course',
        description: 'test',
        instructor: instructor._id,
        students: [student._id],
        published: true,
      });
      // As owner
      const resultOwner = await courseService.getCourseDetails(course._id, {
        id: sId(instructor),
        role: 'instructor',
      });
      expect(resultOwner.students).toBeDefined();

      // As enrolled student
      const resultStudent = await courseService.getCourseDetails(course._id, {
        id: sId(student),
        role: 'student',
      });
      expect(resultStudent.students).toBeDefined();

      // As admin
      const admin = (await createTestUser({ role: 'admin' })).user;
      const resultAdmin = await courseService.getCourseDetails(course._id, {
        id: sId(admin),
        role: 'admin',
      });
      expect(resultAdmin.students).toBeDefined();
    });

    it('returns students as ObjectId instances (not populated) for outsiders', async () => {
      const course = await Course.create({
        title: 'Public Course',
        description: 'test',
        instructor: instructor._id,
        students: [student._id],
        published: true,
      });
      const outsider = (await createTestUser({ role: 'student' })).user;
      const result = await courseService.getCourseDetails(course._id, {
        id: sId(outsider),
        role: 'student',
      });
      // The students field should be an array of ObjectId instances (not populated)
      expect(result.students).toBeDefined();
      expect(Array.isArray(result.students)).toBe(true);
      // Check that the first element is an ObjectId (instance of mongoose.Types.ObjectId)
      expect(result.students[0]).toBeInstanceOf(mongoose.Types.ObjectId);
      // Or check that it does NOT have a 'name' property (populated would have name)
      expect(result.students[0].name).toBeUndefined();
    });
  });

  describe('updateCourse', () => {
    it('updates course fields', async () => {
      const course = await Course.create({
        title: 'Old Title',
        description: 'Old desc',
        instructor: instructor._id,
      });
      const updated = await courseService.updateCourse(course._id, {
        title: 'New Title',
        description: 'New desc',
      });
      expect(updated.title).toBe('New Title');
      expect(updated.description).toBe('New desc');
    });
  });

  describe('deleteCourse', () => {
    it('deletes course and cascades assignments, reviews, weekly tasks, orphans sessions', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
      });
      const course = await Course.create({
        title: 'Delete Course',
        description: 'test',
        instructor: instructor._id,
        track: track._id,
        students: [student._id],
      });
      const session = await Session.create({
        title: 'Session in Course',
        instructor: instructor._id,
        course: course._id,
        tracks: [track._id],
        students: [student._id],
        published: true,
      });
      track.courses.push(course._id);
      track.sessions.push(session._id);
      await track.save();
      course.sessions.push(session._id);
      await course.save();

      const assignment = await Assignment.create({
        title: 'Assignment',
        description: 'desc',
        instructor: instructor._id,
        course: course._id,
        deadline: new Date(),
      });
      const review = await Review.create({
        user: student._id,
        course: course._id,
        rating: 5,
        content: 'Good',
      });
      const weeklyTask = await WeeklyTask.create({
        course: course._id,
        instructor: instructor._id,
        week: 1,
        title: 'Week 1',
        items: [{ title: 'Item' }],
      });

      await courseService.deleteCourse(course._id);

      expect(await Course.findById(course._id)).toBeNull();
      expect(await Assignment.findById(assignment._id)).toBeNull();
      expect(await Review.findById(review._id)).toBeNull();
      expect(await WeeklyTask.findById(weeklyTask._id)).toBeNull();
      // Session should be orphaned (course null, isStandalone false because it has track)
      const orphanedSession = await Session.findById(session._id);
      expect(orphanedSession.course).toBeNull();
      expect(orphanedSession.isStandalone).toBe(false);
      // Student removed from course
      const user = await User.findById(student._id);
      expect(user.enrolledCourses.map((id) => id.toString())).not.toContain(
        course._id.toString(),
      );
    });

    it('throws 404 if course not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(courseService.deleteCourse(fakeId)).rejects.toThrow(
        'No course found',
      );
    });
  });

  describe('addSessionToCourse', () => {
    it('adds a session to a course', async () => {
      const course = await Course.create({
        title: 'Course',
        description: 'test',
        instructor: instructor._id,
      });
      const session = await Session.create({
        title: 'Session',
        instructor: instructor._id,
        published: true,
      });
      const updated = await courseService.addSessionToCourse(
        course._id,
        session._id,
      );
      expect(updated.sessions.map((id) => id.toString())).toContain(
        session._id.toString(),
      );
      const savedSession = await Session.findById(session._id);
      expect(savedSession.course.toString()).toBe(course._id.toString());
    });

    it('throws 400 if session already in course', async () => {
      const course = await Course.create({
        title: 'Course',
        description: 'test',
        instructor: instructor._id,
      });
      const session = await Session.create({
        title: 'Session',
        instructor: instructor._id,
        published: true,
      });
      // First add (use string ID)
      await courseService.addSessionToCourse(course._id, sId(session));
      // Second add should throw
      await expect(
        courseService.addSessionToCourse(course._id, sId(session)),
      ).rejects.toThrow('Session already exists in this course');
    });
  });

  describe('removeSessionFromCourse', () => {
    it('removes a session from a course', async () => {
      const course = await Course.create({
        title: 'Course',
        description: 'test',
        instructor: instructor._id,
      });
      const session = await Session.create({
        title: 'Session',
        instructor: instructor._id,
        published: true,
      });
      // Add session first (use string ID)
      await courseService.addSessionToCourse(course._id, sId(session));
      const updated = await courseService.removeSessionFromCourse(
        course._id,
        sId(session),
      );
      expect(updated.sessions.map((id) => id.toString())).not.toContain(
        session._id.toString(),
      );
      const savedSession = await Session.findById(session._id);
      expect(savedSession.course).toBeNull();
    });

    it('throws 400 if session not in course', async () => {
      const course = await Course.create({
        title: 'Course',
        description: 'test',
        instructor: instructor._id,
      });
      const session = await Session.create({
        title: 'Session',
        instructor: instructor._id,
        published: true,
      });
      await expect(
        courseService.removeSessionFromCourse(course._id, sId(session)),
      ).rejects.toThrow('Session is not in this course');
    });
  });

  describe('enrollStudentInCourse', () => {
    it('enrolls a student', async () => {
      const course = await Course.create({
        title: 'Course',
        description: 'test',
        instructor: instructor._id,
      });
      const updated = await courseService.enrollStudentInCourse(
        course._id,
        sId(student),
      );
      expect(updated.students.map((id) => id.toString())).toContain(
        sId(student),
      );
      const user = await User.findById(student._id);
      expect(user.enrolledCourses.map((id) => id.toString())).toContain(
        course._id.toString(),
      );
    });

    it('throws 400 if student already enrolled', async () => {
      const course = await Course.create({
        title: 'Course',
        description: 'test',
        instructor: instructor._id,
        students: [student._id],
      });
      await expect(
        courseService.enrollStudentInCourse(course._id, sId(student)),
      ).rejects.toThrow('Student is already enrolled');
    });
  });

  describe('removeStudentFromCourse', () => {
    it('removes a student', async () => {
      const course = await Course.create({
        title: 'Course',
        description: 'test',
        instructor: instructor._id,
        students: [student._id],
      });
      const updated = await courseService.removeStudentFromCourse(
        course._id,
        sId(student),
      );
      expect(updated.students.map((id) => id.toString())).not.toContain(
        sId(student),
      );
      const user = await User.findById(student._id);
      expect(user.enrolledCourses.map((id) => id.toString())).not.toContain(
        course._id.toString(),
      );
    });

    it('throws 400 if student not enrolled', async () => {
      const course = await Course.create({
        title: 'Course',
        description: 'test',
        instructor: instructor._id,
      });
      await expect(
        courseService.removeStudentFromCourse(course._id, sId(student)),
      ).rejects.toThrow('Student is not enrolled');
    });
  });

  describe('getCoursesByInstructor, getCoursesByTrack, getCoursesByStudent', () => {
    it('returns courses filtered by instructor', async () => {
      await Course.create([
        { title: 'InstructorA', description: '1', instructor: instructor._id },
        {
          title: 'InstructorB',
          description: '2',
          instructor: otherInstructor._id,
        },
      ]);
      const result = await courseService.getCoursesByInstructor(
        sId(instructor),
        {},
      );
      expect(result.courses).toHaveLength(1);
      expect(result.courses[0].instructor._id.toString()).toBe(sId(instructor));
    });

    it('returns courses by track', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
      });
      const course = await Course.create({
        title: 'TrackCourse',
        description: 'test',
        instructor: instructor._id,
        track: track._id,
        published: true,
      });
      const result = await courseService.getCoursesByTrack(sId(track), {});
      expect(result.courses).toHaveLength(1);
      expect(result.courses[0]._id.toString()).toBe(course._id.toString());
    });

    it('returns courses by student', async () => {
      const course = await Course.create({
        title: 'StudentCourse',
        description: 'test',
        instructor: instructor._id,
        students: [student._id],
        published: true,
      });
      const result = await courseService.getCoursesByStudent(sId(student), {});
      expect(result.courses).toHaveLength(1);
      expect(result.courses[0]._id.toString()).toBe(course._id.toString());
    });
  });
});
