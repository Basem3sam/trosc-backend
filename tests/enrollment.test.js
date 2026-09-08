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
    studentId = student.user._id.toString(); // store as string

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

  describe('Track Self-Enrollment', () => {
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

    it('instructor can approve a pending request', async () => {
      // Enroll the student
      const enrollRes = await request(app)
        .post(`/v1/tracks/${trackId}/enroll-me`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(enrollRes.status).toBe(200);

      // Verify the student is in pendingStudents
      let track = await Track.findById(trackId);
      expect(track.pendingStudents.map((id) => id.toString())).toContain(
        studentId,
      );

      // Approve
      const res = await request(app)
        .post(`/v1/tracks/${trackId}/students/${studentId}/approve`)
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(res.status).toBe(200);

      track = await Track.findById(trackId);
      expect(track.students.map((id) => id.toString())).toContain(studentId);
      expect(track.pendingStudents).toHaveLength(0);
    });

    it('instructor can reject a pending request', async () => {
      await request(app)
        .post(`/v1/tracks/${trackId}/enroll-me`)
        .set('Authorization', `Bearer ${studentToken}`);
      const res = await request(app)
        .post(`/v1/tracks/${trackId}/students/${studentId}/reject`)
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(res.status).toBe(200);
      const track = await Track.findById(trackId);
      expect(track.pendingStudents).toHaveLength(0);
    });

    it('student cannot approve their own request', async () => {
      await request(app)
        .post(`/v1/tracks/${trackId}/enroll-me`)
        .set('Authorization', `Bearer ${studentToken}`);
      const res = await request(app)
        .post(`/v1/tracks/${trackId}/students/${studentId}/approve`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Track Leave Requests', () => {
    it('student can request to leave (pending approval)', async () => {
      // Enroll and approve first
      await request(app)
        .post(`/v1/tracks/${trackId}/enroll-me`)
        .set('Authorization', `Bearer ${studentToken}`);
      await request(app)
        .post(`/v1/tracks/${trackId}/students/${studentId}/approve`)
        .set('Authorization', `Bearer ${instructorToken}`);

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
      // Enroll and approve
      await request(app)
        .post(`/v1/tracks/${trackId}/enroll-me`)
        .set('Authorization', `Bearer ${studentToken}`);
      await request(app)
        .post(`/v1/tracks/${trackId}/students/${studentId}/approve`)
        .set('Authorization', `Bearer ${instructorToken}`);
      // Request leave
      await request(app)
        .post(`/v1/tracks/${trackId}/leave-me`)
        .set('Authorization', `Bearer ${studentToken}`);

      const res = await request(app)
        .post(`/v1/tracks/${trackId}/leaves/${studentId}/approve`)
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(res.status).toBe(200);
      const track = await Track.findById(trackId);
      // track.students holds ObjectId instances; studentId is a plain
      // string, so this must be mapped to strings before comparing or
      // toContainEqual's deep-equality check is meaningless.
      expect(track.students.map((id) => id.toString())).not.toContain(
        studentId,
      );
      expect(track.pendingLeaves).toHaveLength(0);
    });

    it('instructor can reject a leave request', async () => {
      await request(app)
        .post(`/v1/tracks/${trackId}/enroll-me`)
        .set('Authorization', `Bearer ${studentToken}`);
      await request(app)
        .post(`/v1/tracks/${trackId}/students/${studentId}/approve`)
        .set('Authorization', `Bearer ${instructorToken}`);
      await request(app)
        .post(`/v1/tracks/${trackId}/leave-me`)
        .set('Authorization', `Bearer ${studentToken}`);

      const res = await request(app)
        .post(`/v1/tracks/${trackId}/leaves/${studentId}/reject`)
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(res.status).toBe(200);
      const track = await Track.findById(trackId);
      expect(track.students.map((id) => id.toString())).toContainEqual(
        studentId,
      );
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
      // Enroll in track and approve. Note: this cascades the student into
      // every course/session that ALREADY belongs to the track at approval
      // time (see cascade.service.js / cascade.test.js), so `courseId` from
      // the outer beforeEach would already be auto-enrolled and a follow-up
      // enroll-me call would 400 with "already enrolled" rather than
      // exercising the track-only access gate. To actually test the gate,
      // add a NEW course to the track after approval, so cascade never
      // touches it and the student must self-enroll.
      await request(app)
        .post(`/v1/tracks/${trackId}/enroll-me`)
        .set('Authorization', `Bearer ${studentToken}`);
      await request(app)
        .post(`/v1/tracks/${trackId}/students/${studentId}/approve`)
        .set('Authorization', `Bearer ${instructorToken}`);

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

    it('student cannot enroll in a private course (requires instructor approval)', async () => {
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
      // Same reasoning as the course test above: cascade already enrolls
      // the student into `sessionId` from the outer beforeEach at approval
      // time, so a session added to the track AFTER approval is needed to
      // actually exercise the track-only access gate via enroll-me.
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
      expect(session.students.map((id) => id.toString())).toContain(
        studentId,
      );
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
