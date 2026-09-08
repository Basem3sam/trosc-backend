const request = require('supertest');
const app = require('../src/app');
const Track = require('../src/models/track.model');
const Course = require('../src/models/course.model');
const Session = require('../src/models/session.model');
const { createTestUser } = require('./helpers/testUser');

describe('Enrollment (Self-enroll, Approve, Reject, Leave)', () => {
  let instructorToken, studentToken, studentId, trackId, courseId, sessionId;

  beforeEach(async () => {
    const instructor = await createTestUser({ role: 'instructor' });
    instructorToken = instructor.token;

    const student = await createTestUser({ role: 'student' });
    studentToken = student.token;
    studentId = student.user._id.toString();

    const track = await Track.create({
      title: 'Enrollment Track',
      description: 'For enrollment tests',
      instructor: instructor.user._id,
      published: true,
    });
    trackId = track._id;

    const course = await Course.create({
      title: 'Enrollment Course',
      description: 'Course in track',
      instructor: instructor.user._id,
      track: track._id,
    });
    courseId = course._id;
    await Track.findByIdAndUpdate(trackId, {
      $addToSet: { courses: courseId },
    });

    const session = await Session.create({
      title: 'Enrollment Session',
      instructor: instructor.user._id,
      tracks: [trackId],
    });
    sessionId = session._id;
    await Track.findByIdAndUpdate(trackId, {
      $addToSet: { sessions: sessionId },
    });
  });

  describe('Track Self-Enrollment (endpoint tests)', () => {
    it('student can request enrollment (pending approval)', async () => {
      const res = await request(app)
        .post(`/v1/tracks/${trackId}/enroll-me`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      const track = await Track.findById(trackId);
      expect(track.pendingStudents.map((id) => id.toString())).toContain(
        studentId,
      );
    });

    it('returns 400 if already pending', async () => {
      await request(app)
        .post(`/v1/tracks/${trackId}/enroll-me`)
        .set('Authorization', `Bearer ${studentToken}`);
      const res = await request(app)
        .post(`/v1/tracks/${trackId}/enroll-me`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(400);
    });
  });

  describe('Approve / Reject (direct DB setup)', () => {
    beforeEach(async () => {
      await Track.findByIdAndUpdate(trackId, {
        $addToSet: { pendingStudents: studentId },
      });
    });

    it('instructor can approve a pending request', async () => {
      const res = await request(app)
        .post(`/v1/tracks/${trackId}/students/${studentId}/approve`)
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(res.status).toBe(200);
      const track = await Track.findById(trackId);
      expect(track.students.map((id) => id.toString())).toContain(studentId);
      expect(track.pendingStudents).toHaveLength(0);
    });

    it('instructor can reject a pending request', async () => {
      const res = await request(app)
        .post(`/v1/tracks/${trackId}/students/${studentId}/reject`)
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(res.status).toBe(200);
      const track = await Track.findById(trackId);
      expect(track.pendingStudents).toHaveLength(0);
    });

    it('student cannot approve their own request', async () => {
      const res = await request(app)
        .post(`/v1/tracks/${trackId}/students/${studentId}/approve`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Track Leave Requests (direct DB setup)', () => {
    beforeEach(async () => {
      await Track.findByIdAndUpdate(trackId, {
        $addToSet: { students: studentId },
      });
    });

    it('student can request to leave (pending approval)', async () => {
      const res = await request(app)
        .post(`/v1/tracks/${trackId}/leave-me`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      const track = await Track.findById(trackId);
      expect(track.pendingLeaves.map((id) => id.toString())).toContain(
        studentId,
      );
    });

    it('instructor can approve a leave request', async () => {
      await request(app)
        .post(`/v1/tracks/${trackId}/leave-me`)
        .set('Authorization', `Bearer ${studentToken}`);
      const res = await request(app)
        .post(`/v1/tracks/${trackId}/leaves/${studentId}/approve`)
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(res.status).toBe(200);
      const track = await Track.findById(trackId);
      expect(track.students).not.toContainEqual(studentId);
      expect(track.pendingLeaves).toHaveLength(0);
    });

    it('instructor can reject a leave request', async () => {
      await request(app)
        .post(`/v1/tracks/${trackId}/leave-me`)
        .set('Authorization', `Bearer ${studentToken}`);
      const res = await request(app)
        .post(`/v1/tracks/${trackId}/leaves/${studentId}/reject`)
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(res.status).toBe(200);
      const track = await Track.findById(trackId);
      expect(track.students).toContainEqual(studentId);
      expect(track.pendingLeaves).toHaveLength(0);
    });
  });

  describe('Course Self-Enrollment (Access Rules)', () => {
    it('student can enroll in a public course', async () => {
      const instructor = await createTestUser({ role: 'instructor' });
      const publicCourse = await Course.create({
        title: 'Public Course',
        description: 'Anyone can join',
        instructor: instructor.user._id,
        access: 'public',
        published: true,
      });
      const res = await request(app)
        .post(`/v1/courses/${publicCourse._id}/enroll-me`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      const course = await Course.findById(publicCourse._id);
      expect(course.students.map((id) => id.toString())).toContain(studentId);
    });

    it('student can enroll in a track-only course if in the track', async () => {
      await Track.findByIdAndUpdate(trackId, {
        $addToSet: { students: studentId },
      });
      const res = await request(app)
        .post(`/v1/courses/${courseId}/enroll-me`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      const course = await Course.findById(courseId);
      expect(course.students.map((id) => id.toString())).toContain(studentId);
    });

    it('student cannot enroll in a private course', async () => {
      const instructor = await createTestUser({ role: 'instructor' });
      const privateCourse = await Course.create({
        title: 'Private Course',
        description: 'Instructor only',
        instructor: instructor.user._id,
        access: 'private',
        published: true,
      });
      const res = await request(app)
        .post(`/v1/courses/${privateCourse._id}/enroll-me`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Session Self-Enrollment', () => {
    it('student can enroll in a session if in the track/course', async () => {
      await Track.findByIdAndUpdate(trackId, {
        $addToSet: { students: studentId },
      });
      const res = await request(app)
        .post(`/v1/sessions/${sessionId}/enroll-me`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      const session = await Session.findById(sessionId);
      expect(session.students.map((id) => id.toString())).toContain(studentId);
    });

    it('student cannot enroll in a private session', async () => {
      const instructor = await createTestUser({ role: 'instructor' });
      const privateSession = await Session.create({
        title: 'Private Session',
        instructor: instructor.user._id,
        access: 'private',
        published: true,
      });
      const res = await request(app)
        .post(`/v1/sessions/${privateSession._id}/enroll-me`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });
  });
});
