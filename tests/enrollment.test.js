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

  // ============================================================
  // 1. ENDPOINT TESTS – self‑enroll and leave endpoints
  // ============================================================
  describe('Track Self-Enrollment (endpoint)', () => {
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

  // ============================================================
  // 2. APPROVE / REJECT – direct DB setup (no endpoint calls)
  // ============================================================
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

  // ============================================================
  // 3. LEAVE REQUESTS – direct DB setup
  // ============================================================
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
      expect(track.students.map((id) => id.toString())).not.toContain(
        studentId,
      );
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
      expect(track.students.map((id) => id.toString())).toContain(studentId);
      expect(track.pendingLeaves).toHaveLength(0);
    });
  });

  // ============================================================
  // 4. COURSE SELF-ENROLLMENT (Access Rules)
  // ============================================================
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
      // Enroll and approve (auto-enrolls into existing courses)
      await request(app)
        .post(`/v1/tracks/${trackId}/enroll-me`)
        .set('Authorization', `Bearer ${studentToken}`);
      await request(app)
        .post(`/v1/tracks/${trackId}/students/${studentId}/approve`)
        .set('Authorization', `Bearer ${instructorToken}`);

      // Add a NEW course to the track after approval – cascade won't touch it
      const instructor = await createTestUser({ role: 'instructor' });
      const lateCourse = await Course.create({
        title: 'Course Added After Approval',
        description: 'Added to the track after the student already joined',
        instructor: instructor.user._id,
        track: trackId,
        published: true,
      });
      await Track.findByIdAndUpdate(trackId, {
        $addToSet: { courses: lateCourse._id },
      });

      const res = await request(app)
        .post(`/v1/courses/${lateCourse._id}/enroll-me`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      const course = await Course.findById(lateCourse._id);
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

  // ============================================================
  // 5. SESSION SELF-ENROLLMENT
  // ============================================================
  describe('Session Self-Enrollment', () => {
    it('student can enroll in a session if in the track/course', async () => {
      // Same approach: add a session AFTER approval to test the gate
      await request(app)
        .post(`/v1/tracks/${trackId}/enroll-me`)
        .set('Authorization', `Bearer ${studentToken}`);
      await request(app)
        .post(`/v1/tracks/${trackId}/students/${studentId}/approve`)
        .set('Authorization', `Bearer ${instructorToken}`);

      const instructor = await createTestUser({ role: 'instructor' });
      const lateSession = await Session.create({
        title: 'Session Added After Approval',
        instructor: instructor.user._id,
        tracks: [trackId],
        published: true,
      });
      await Track.findByIdAndUpdate(trackId, {
        $addToSet: { sessions: lateSession._id },
      });

      const res = await request(app)
        .post(`/v1/sessions/${lateSession._id}/enroll-me`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      const session = await Session.findById(lateSession._id);
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

  describe('Course Self-Enrollment (Prerequisites)', () => {
    let instructor, student, studentToken, studentId, track, courseA, courseB;

    beforeEach(async () => {
      instructor = await createTestUser({ role: 'instructor' });
      student = await createTestUser({ role: 'student' });
      studentToken = student.token;
      studentId = student.user._id.toString();

      track = await Track.create({
        title: 'Prerequisite Track',
        description: 'For testing prerequisites',
        instructor: instructor.user._id,
        published: true,
      });

      courseA = await Course.create({
        title: 'Intro Course (Prereq)',
        description: 'Must take this first',
        instructor: instructor.user._id,
        track: track._id,
        published: true,
        access: 'public',
      });

      courseB = await Course.create({
        title: 'Advanced Course',
        description: 'Requires Intro Course',
        instructor: instructor.user._id,
        track: track._id,
        published: true,
        access: 'public',
        prerequisites: [courseA._id],
      });

      // Add courses to track
      await Track.findByIdAndUpdate(track._id, {
        $addToSet: { courses: [courseA._id, courseB._id] },
      });
    });

    it('prevents enrollment if prerequisites are not met', async () => {
      const res = await request(app)
        .post(`/v1/courses/${courseB._id}/enroll-me`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/prerequisites/);
    });

    it('allows enrollment after completing prerequisites', async () => {
      // Enroll in courseA first
      await request(app)
        .post(`/v1/courses/${courseA._id}/enroll-me`)
        .set('Authorization', `Bearer ${studentToken}`);

      // Now enroll in courseB (prereq met)
      const res = await request(app)
        .post(`/v1/courses/${courseB._id}/enroll-me`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      const course = await Course.findById(courseB._id);
      expect(course.students.map((id) => id.toString())).toContain(studentId);
    });
  });
});
