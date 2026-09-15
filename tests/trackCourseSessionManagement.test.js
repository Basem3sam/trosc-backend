const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const trackService = require('../src/services/track.service');
const trackController = require('../src/controllers/track.controller');
const Track = require('../src/models/track.model');
const Course = require('../src/models/course.model');
const Session = require('../src/models/session.model');
const User = require('../src/models/user.model');
const { createTestUser } = require('./helpers/testUser');

describe('Track <-> Course/Session/Student management (service + routes)', () => {
  let instructor;
  let adminToken;
  let student1;
  let student2;
  let track;

  beforeEach(async () => {
    const inst = await createTestUser({ role: 'instructor' });
    instructor = inst.user;
    const admin = await createTestUser({ role: 'admin' });
    adminToken = admin.token;
    student1 = (await createTestUser({ role: 'student' })).user;
    student2 = (await createTestUser({ role: 'student' })).user;

    track = await Track.create({
      title: 'Mgmt Track',
      description: 'Track for course/session mgmt tests',
      instructor: instructor._id,
      students: [student1._id, student2._id],
    });
  });

  describe('addCourseToTrack (service)', () => {
    it('adds a course, enrolls existing track students, and updates both sides', async () => {
      const course = await Course.create({
        title: 'Standalone Course',
        description: 'Not yet in a track',
        instructor: instructor._id,
      });

      const updated = await trackService.addCourseToTrack(
        track._id.toString(),
        course._id.toString(),
      );

      expect(updated.courses.map((id) => id.toString())).toContain(
        course._id.toString(),
      );

      const refreshedCourse = await Course.findById(course._id);
      expect(refreshedCourse.track._id.toString()).toBe(track._id.toString());
      expect(refreshedCourse.students.map((id) => id.toString())).toEqual(
        expect.arrayContaining([
          student1._id.toString(),
          student2._id.toString(),
        ]),
      );

      const u1 = await User.findById(student1._id);
      expect(u1.enrolledCourses.map((id) => id.toString())).toContain(
        course._id.toString(),
      );
    });

    it('re-parents a course that already belongs to a different track', async () => {
      const otherTrack = await Track.create({
        title: 'Other Track',
        description: 'Course starts here',
        instructor: instructor._id,
      });
      const course = await Course.create({
        title: 'Movable Course',
        description: 'Belongs elsewhere first',
        instructor: instructor._id,
        track: otherTrack._id,
      });
      otherTrack.courses.push(course._id);
      await otherTrack.save();

      await trackService.addCourseToTrack(
        track._id.toString(),
        course._id.toString(),
      );

      const refreshedOther = await Track.findById(otherTrack._id);
      expect(refreshedOther.courses.map((id) => id.toString())).not.toContain(
        course._id.toString(),
      );

      const refreshedCourse = await Course.findById(course._id);
      expect(refreshedCourse.track._id.toString()).toBe(track._id.toString());
    });

    it('throws 404 when track not found', async () => {
      const course = await Course.create({
        title: 'Orphan',
        description: 'No track yet',
        instructor: instructor._id,
      });
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        trackService.addCourseToTrack(fakeId, course._id),
      ).rejects.toThrow('No track found');
    });

    it('throws 404 when course not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        trackService.addCourseToTrack(track._id, fakeId),
      ).rejects.toThrow('No course found');
    });

    it('throws 400 when course already in this track', async () => {
      const course = await Course.create({
        title: 'Already In',
        description: 'Already a member',
        instructor: instructor._id,
        track: track._id,
      });
      track.courses.push(course._id);
      await track.save();

      await expect(
        trackService.addCourseToTrack(
          track._id.toString(),
          course._id.toString(),
        ),
      ).rejects.toThrow('Course already in this track');
    });
  });

  describe('removeCourseFromTrack (service)', () => {
    it('removes a course and orphans it', async () => {
      const course = await Course.create({
        title: 'Removable Course',
        description: 'Will be removed',
        instructor: instructor._id,
        track: track._id,
      });
      track.courses.push(course._id);
      track.sessions.push(new mongoose.Types.ObjectId()); // keep track non-empty
      await track.save();

      const updated = await trackService.removeCourseFromTrack(
        track._id,
        course._id,
      );
      expect(updated.courses.map((id) => id.toString())).not.toContain(
        course._id.toString(),
      );

      const refreshedCourse = await Course.findById(course._id);
      expect(refreshedCourse.track).toBeNull();
    });

    it('unenrolls the track students from the detached course', async () => {
      const course = await Course.create({
        title: 'Removable Gated Course',
        description: 'Was only reachable via the track',
        instructor: instructor._id,
        track: track._id,
        students: [student1._id, student2._id],
      });
      track.courses.push(course._id);
      track.sessions.push(new mongoose.Types.ObjectId()); // keep track non-empty
      await User.updateMany(
        { _id: { $in: [student1._id, student2._id] } },
        { $addToSet: { enrolledCourses: course._id } },
      );
      await track.save();

      await trackService.removeCourseFromTrack(track._id, course._id);

      const refreshedCourse = await Course.findById(course._id);
      expect(refreshedCourse.students.map((id) => id.toString())).toEqual([]);

      const u1 = await User.findById(student1._id);
      const u2 = await User.findById(student2._id);
      expect(u1.enrolledCourses.map((id) => id.toString())).not.toContain(
        course._id.toString(),
      );
      expect(u2.enrolledCourses.map((id) => id.toString())).not.toContain(
        course._id.toString(),
      );
    });

    it('throws 404 when track not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        trackService.removeCourseFromTrack(fakeId, fakeId),
      ).rejects.toThrow('No track found');
    });

    it('throws 400 when removing the last course/session would empty the track', async () => {
      const course = await Course.create({
        title: 'Only Content',
        description: 'The only thing in the track',
        instructor: instructor._id,
        track: track._id,
      });
      track.courses.push(course._id);
      await track.save();

      await expect(
        trackService.removeCourseFromTrack(track._id, course._id),
      ).rejects.toThrow(
        'Cannot remove last course: track must have at least one course or session',
      );
    });
  });

  describe('addSessionToTrack (service)', () => {
    it('adds a session, enrolls existing track students, and flips isStandalone', async () => {
      const session = await Session.create({
        title: 'Standalone Session',
        instructor: instructor._id,
      });
      expect(session.isStandalone).toBe(true);

      const updated = await trackService.addSessionToTrack(
        track._id,
        session._id,
      );
      expect(updated.sessions.map((id) => id.toString())).toContain(
        session._id.toString(),
      );

      const refreshedSession = await Session.findById(session._id);
      expect(refreshedSession.isStandalone).toBe(false);
      expect(refreshedSession.students.map((id) => id.toString())).toEqual(
        expect.arrayContaining([
          student1._id.toString(),
          student2._id.toString(),
        ]),
      );

      const u1 = await User.findById(student1._id);
      expect(u1.enrolledSessions.map((id) => id.toString())).toContain(
        session._id.toString(),
      );
    });

    it('throws 404 when track not found', async () => {
      const session = await Session.create({
        title: 'Orphan Session',
        instructor: instructor._id,
      });
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        trackService.addSessionToTrack(fakeId, session._id),
      ).rejects.toThrow('No track found');
    });

    it('throws 404 when session not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        trackService.addSessionToTrack(track._id, fakeId),
      ).rejects.toThrow('No session found');
    });

    it('throws 400 when session already in this track', async () => {
      const session = await Session.create({
        title: 'Already In Session',
        instructor: instructor._id,
        tracks: [track._id],
      });
      track.sessions.push(session._id);
      await track.save();

      await expect(
        trackService.addSessionToTrack(
          track._id.toString(),
          session._id.toString(),
        ),
      ).rejects.toThrow('Session already in this track');
    });
  });

  describe('removeSessionFromTrack (service)', () => {
    it('removes a session, keeps it standalone-false if it still has a course', async () => {
      const course = await Course.create({
        title: 'Anchor Course',
        description: 'Keeps the session non-standalone',
        instructor: instructor._id,
        track: track._id,
      });
      const session = await Session.create({
        title: 'Session With Course',
        instructor: instructor._id,
        tracks: [track._id],
        course: course._id,
        isStandalone: false,
      });
      track.courses.push(course._id);
      track.sessions.push(session._id);
      await track.save();

      const updated = await trackService.removeSessionFromTrack(
        track._id,
        session._id,
      );
      expect(updated.sessions.map((id) => id.toString())).not.toContain(
        session._id.toString(),
      );

      const refreshedSession = await Session.findById(session._id);
      expect(refreshedSession.tracks.map((id) => id.toString())).not.toContain(
        track._id.toString(),
      );
      expect(refreshedSession.isStandalone).toBe(false);
    });

    it('marks the session standalone again once it has no track or course', async () => {
      const course = await Course.create({
        title: 'Keep Track Non Empty',
        description: 'So removing the session is allowed',
        instructor: instructor._id,
        track: track._id,
      });
      const session = await Session.create({
        title: 'Now Standalone Again',
        instructor: instructor._id,
        tracks: [track._id],
        isStandalone: false,
      });
      track.courses.push(course._id);
      track.sessions.push(session._id);
      await track.save();

      await trackService.removeSessionFromTrack(track._id, session._id);

      const refreshedSession = await Session.findById(session._id);
      expect(refreshedSession.isStandalone).toBe(true);
    });

    it('unenrolls the track students from the detached session', async () => {
      const course = await Course.create({
        title: 'Keep Track Non Empty For Unenroll Test',
        description: 'So removing the session is allowed',
        instructor: instructor._id,
        track: track._id,
      });
      const session = await Session.create({
        title: 'Gated Session',
        instructor: instructor._id,
        tracks: [track._id],
        students: [student1._id, student2._id],
      });
      track.courses.push(course._id);
      track.sessions.push(session._id);
      await User.updateMany(
        { _id: { $in: [student1._id, student2._id] } },
        { $addToSet: { enrolledSessions: session._id } },
      );
      await track.save();

      await trackService.removeSessionFromTrack(track._id, session._id);

      const refreshedSession = await Session.findById(session._id);
      expect(refreshedSession.students.map((id) => id.toString())).toEqual([]);

      const u1 = await User.findById(student1._id);
      const u2 = await User.findById(student2._id);
      expect(u1.enrolledSessions.map((id) => id.toString())).not.toContain(
        session._id.toString(),
      );
      expect(u2.enrolledSessions.map((id) => id.toString())).not.toContain(
        session._id.toString(),
      );
    });

    it('throws 404 when track not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        trackService.removeSessionFromTrack(fakeId, fakeId),
      ).rejects.toThrow('No track found');
    });

    it('throws 400 when removing the last session/course would empty the track', async () => {
      const session = await Session.create({
        title: 'Only Content Session',
        instructor: instructor._id,
        tracks: [track._id],
      });
      track.sessions.push(session._id);
      await track.save();

      await expect(
        trackService.removeSessionFromTrack(track._id, session._id),
      ).rejects.toThrow(
        'Cannot remove last session: track must have at least one course or session',
      );
    });
  });

  describe('getTracksByInstructor (service)', () => {
    it('returns tracks scoped to the given instructor', async () => {
      const otherInstructor = (await createTestUser({ role: 'instructor' }))
        .user;
      await Track.create({
        title: 'Someone Elses Track',
        description: 'Different instructor',
        instructor: otherInstructor._id,
      });

      const { tracks, total } = await trackService.getTracksByInstructor(
        instructor._id.toString(),
        {},
      );

      expect(total).toBeGreaterThanOrEqual(1);
      expect(
        tracks.every(
          (t) => t.instructor._id.toString() === instructor._id.toString(),
        ),
      ).toBe(true);
    });
  });

  describe('HTTP routes: add/remove course & session on a track', () => {
    it('PATCH /:trackId/courses/:courseId adds a course', async () => {
      const course = await Course.create({
        title: 'HTTP Course',
        description: 'Added via route',
        instructor: instructor._id,
      });

      const res = await request(app)
        .patch(`/v1/tracks/${track._id}/courses/${course._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.data.track.courses).toEqual(
        expect.arrayContaining([course._id.toString()]),
      );
    });

    it('DELETE /:trackId/courses/:courseId removes a course', async () => {
      const course = await Course.create({
        title: 'HTTP Removable Course',
        description: 'Removed via route',
        instructor: instructor._id,
        track: track._id,
      });
      track.courses.push(course._id);
      track.sessions.push(new mongoose.Types.ObjectId());
      await track.save();

      const res = await request(app)
        .delete(`/v1/tracks/${track._id}/courses/${course._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.track.courses).not.toEqual(
        expect.arrayContaining([course._id.toString()]),
      );
    });

    it('PATCH /:trackId/sessions/:sessionId adds a session', async () => {
      const session = await Session.create({
        title: 'HTTP Session',
        instructor: instructor._id,
      });

      const res = await request(app)
        .patch(`/v1/tracks/${track._id}/sessions/${session._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Session added to track successfully.');
      expect(res.body.data.track.sessions).toEqual(
        expect.arrayContaining([session._id.toString()]),
      );
    });

    it('DELETE /:trackId/sessions/:sessionId removes a session', async () => {
      const course = await Course.create({
        title: 'Keeps Track Non Empty',
        description: 'So we can remove the session',
        instructor: instructor._id,
        track: track._id,
      });
      const session = await Session.create({
        title: 'HTTP Removable Session',
        instructor: instructor._id,
        tracks: [track._id],
      });
      track.courses.push(course._id);
      track.sessions.push(session._id);
      await track.save();

      const res = await request(app)
        .delete(`/v1/tracks/${track._id}/sessions/${session._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Session removed from track successfully.');
    });
  });

  describe('HTTP routes: add/remove student on a track', () => {
    it('POST /:id/students enrolls a student directly', async () => {
      const newStudent = (await createTestUser({ role: 'student' })).user;

      const res = await request(app)
        .post(`/v1/tracks/${track._id}/students`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ studentId: newStudent._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.data.track.students).toEqual(
        expect.arrayContaining([newStudent._id.toString()]),
      );
    });

    it('DELETE /:id/students/:studentId removes a student', async () => {
      const res = await request(app)
        .delete(`/v1/tracks/${track._id}/students/${student1._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.track.students).not.toEqual(
        expect.arrayContaining([student1._id.toString()]),
      );
    });
  });

  describe('getTracksByInstructor (controller, direct invocation — no route is wired to it)', () => {
    it('responds with tracks, total, and pagination for the given instructor', async () => {
      const req = {
        params: { instructorId: instructor._id.toString() },
        query: {},
      };
      const next = jest.fn();

      // catchAsync's wrapper doesn't return the inner promise, so awaiting
      // the controller call directly resolves before the async work
      // inside it finishes. Wait on the res.json mock being invoked instead.
      const payload = await new Promise((resolve, reject) => {
        const jsonMock = jest.fn((body) => resolve(body));
        const res = { status: jest.fn(() => ({ json: jsonMock })) };
        const wrappedNext = (err) => {
          next(err);
          if (err) reject(err);
        };
        trackController.getTracksByInstructor(req, res, wrappedNext);
      });

      expect(next).not.toHaveBeenCalled();
      expect(payload.status).toBe('success');
      expect(Array.isArray(payload.data.tracks)).toBe(true);
      expect(
        payload.data.tracks.every(
          (t) => t.instructor._id.toString() === instructor._id.toString(),
        ),
      ).toBe(true);
    });
  });
});
