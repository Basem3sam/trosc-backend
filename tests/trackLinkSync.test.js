const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const trackService = require('../src/services/track.service');
const Track = require('../src/models/track.model');
const Course = require('../src/models/course.model');
const Session = require('../src/models/session.model');
const { createTestUser } = require('./helpers/testUser');

const ids = (list) => list.map((id) => id.toString());

// BACKEND-REQUESTS-2 #4.1 / #4.2: Track.sessions/Track.courses (which feed
// sessionCount/courseCount and the assignment roll-ups) must always agree
// with Session.tracks/Course.track (which feed the list endpoints and
// enrollment). Link/unlink now use atomic, idempotent, self-repairing
// writes instead of load-mutate-save on two documents.
describe('Track <-> Session/Course link sync (#4.1, #4.2)', () => {
  let instructor;
  let instructorToken;
  let track;

  beforeEach(async () => {
    const inst = await createTestUser({ role: 'instructor' });
    instructor = inst.user;
    instructorToken = inst.token;

    track = await Track.create({
      title: 'Sync Track',
      description: 'Track for link sync tests',
      instructor: instructor._id,
    });
  });

  const makeSession = (title, extra = {}) =>
    Session.create({ title, instructor: instructor._id, ...extra });
  const makeCourse = (title, extra = {}) =>
    Course.create({
      title,
      description: 'A course for sync tests',
      instructor: instructor._id,
      ...extra,
    });

  describe('addSessionToTrack', () => {
    it('updates sessions and sessionCount, matching GET /sessions/track/:id', async () => {
      const s1 = await makeSession('Sync Session One');
      const s2 = await makeSession('Sync Session Two');
      const s3 = await makeSession('Sync Session Three');

      await Promise.all(
        [s1, s2, s3].map((s) =>
          request(app)
            .patch(`/v1/tracks/${track._id}/sessions/${s._id}`)
            .set('Authorization', `Bearer ${instructorToken}`)
            .expect(200),
        ),
      );

      const fresh = await Track.findById(track._id);
      expect(fresh.sessions).toHaveLength(3);
      expect(fresh.sessionCount).toBe(3);

      const linked = await Session.find({ tracks: track._id });
      expect(ids(linked.map((s) => s._id)).sort()).toEqual(
        ids(fresh.sessions).sort(),
      );
    });

    it('never duplicates entries when three links run in parallel', async () => {
      const sessions = await Promise.all([
        makeSession('Parallel Session One'),
        makeSession('Parallel Session Two'),
        makeSession('Parallel Session Three'),
      ]);

      await Promise.all(
        sessions.map((s) => trackService.addSessionToTrack(track._id, s._id)),
      );

      const fresh = await Track.findById(track._id);
      expect(fresh.sessions).toHaveLength(3);
      // eslint-disable-next-line no-restricted-syntax
      for (const s of sessions) {
        // eslint-disable-next-line no-await-in-loop
        const after = await Session.findById(s._id);
        expect(ids(after.tracks)).toEqual([track._id.toString()]);
        expect(after.isStandalone).toBe(false);
      }
    });

    it('repairs a link that only exists on the session side (the #4.1 symptom)', async () => {
      // Session says it is in the track; the track does not list it.
      const session = await makeSession('One Sided Session', {
        tracks: [track._id],
      });
      expect((await Track.findById(track._id)).sessions).toHaveLength(0);

      await trackService.addSessionToTrack(track._id, session._id);

      const fresh = await Track.findById(track._id);
      expect(ids(fresh.sessions)).toEqual([session._id.toString()]);
      expect(fresh.sessionCount).toBe(1);
      // no duplicate pushed onto the session side
      const after = await Session.findById(session._id);
      expect(ids(after.tracks)).toEqual([track._id.toString()]);
    });

    it('repairs a link that only exists on the track side', async () => {
      // Track lists the session; the session does not know about the track.
      const session = await makeSession('Other One Sided Session');
      await Track.updateOne(
        { _id: track._id },
        { $addToSet: { sessions: session._id } },
      );

      await trackService.addSessionToTrack(track._id, session._id);

      const after = await Session.findById(session._id);
      expect(ids(after.tracks)).toEqual([track._id.toString()]);
      expect(after.isStandalone).toBe(false);
      expect(
        ids((await Track.findById(track._id)).sessions).filter(
          (id) => id === session._id.toString(),
        ),
      ).toHaveLength(1);
    });

    it('still rejects a link that is already fully in place', async () => {
      const session = await makeSession('Fully Linked Session');
      await trackService.addSessionToTrack(track._id, session._id);

      await expect(
        trackService.addSessionToTrack(track._id, session._id),
      ).rejects.toThrow('Session already in this track');
    });

    it('links a session that has a legacy-invalid field (old code half-wrote this)', async () => {
      // A session whose stored URL would fail today's validation (e.g. it
      // predates the stricter trusted-host check). The old code called
      // session.save(), which re-validates the whole document, AFTER the
      // track had already been saved - leaving a half-written link.
      const session = await makeSession('Legacy Session');
      await Session.collection.updateOne(
        { _id: session._id },
        { $set: { url: 'http://old-host.example/legacy-video' } },
      );

      await trackService.addSessionToTrack(track._id, session._id);

      const fresh = await Track.findById(track._id);
      expect(ids(fresh.sessions)).toEqual([session._id.toString()]);
      const after = await Session.findById(session._id);
      expect(ids(after.tracks)).toEqual([track._id.toString()]);
    });
  });

  describe('removeSessionFromTrack', () => {
    it('keeps both sides and isStandalone in sync', async () => {
      const course = await makeCourse('Keeps Track Non Empty');
      await trackService.addCourseToTrack(track._id, course._id);
      const session = await makeSession('Removable Session');
      await trackService.addSessionToTrack(track._id, session._id);

      await trackService.removeSessionFromTrack(track._id, session._id);

      const fresh = await Track.findById(track._id);
      expect(fresh.sessions).toHaveLength(0);
      expect(fresh.sessionCount).toBe(0);
      const after = await Session.findById(session._id);
      expect(after.tracks).toHaveLength(0);
      expect(after.isStandalone).toBe(true);
    });

    it('does not mark a session standalone while it is still in another track', async () => {
      const course = await makeCourse('Anchor');
      await trackService.addCourseToTrack(track._id, course._id);
      const other = await Track.create({
        title: 'Second Track',
        description: 'Also holds the session',
        instructor: instructor._id,
      });
      const session = await makeSession('Shared Session');
      await trackService.addSessionToTrack(track._id, session._id);
      await trackService.addSessionToTrack(other._id, session._id);

      await trackService.removeSessionFromTrack(track._id, session._id);

      const after = await Session.findById(session._id);
      expect(ids(after.tracks)).toEqual([other._id.toString()]);
      expect(after.isStandalone).toBe(false);
    });
  });

  describe('addCourseToTrack', () => {
    it('updates courses and courseCount for parallel links', async () => {
      const courses = await Promise.all([
        makeCourse('Parallel Course One'),
        makeCourse('Parallel Course Two'),
        makeCourse('Parallel Course Three'),
      ]);

      await Promise.all(
        courses.map((c) => trackService.addCourseToTrack(track._id, c._id)),
      );

      const fresh = await Track.findById(track._id);
      expect(fresh.courses).toHaveLength(3);
      expect(fresh.courseCount).toBe(3);
      expect(await Course.countDocuments({ track: track._id })).toBe(3);
    });

    it('repairs a course whose track points here but the track does not list it (the #4.2 symptom)', async () => {
      const listed = await makeCourse('Listed Course');
      await trackService.addCourseToTrack(track._id, listed._id);
      // Second course points at the track but was never added to it.
      const unlisted = await makeCourse('Unlisted Course', {
        track: track._id,
      });
      expect((await Track.findById(track._id)).courseCount).toBe(1);

      await trackService.addCourseToTrack(track._id, unlisted._id);

      const fresh = await Track.findById(track._id);
      expect(fresh.courseCount).toBe(2);
      expect(ids(fresh.courses)).toEqual(
        expect.arrayContaining([
          listed._id.toString(),
          unlisted._id.toString(),
        ]),
      );
    });

    it('repairs a course the track lists but that does not point back', async () => {
      const course = await makeCourse('Points Nowhere');
      await Track.updateOne(
        { _id: track._id },
        { $addToSet: { courses: course._id } },
      );

      await trackService.addCourseToTrack(track._id, course._id);

      const after = await Course.findById(course._id);
      expect(after.track._id.toString()).toBe(track._id.toString());
    });

    it('detaches the course from every other track that still lists it', async () => {
      const a = await Track.create({
        title: 'Old Track A',
        description: 'Stale reference',
        instructor: instructor._id,
      });
      const b = await Track.create({
        title: 'Old Track B',
        description: 'Stale reference',
        instructor: instructor._id,
      });
      const course = await makeCourse('Wandering Course', { track: a._id });
      await Track.updateMany(
        { _id: { $in: [a._id, b._id] } },
        { $addToSet: { courses: course._id } },
      );

      await trackService.addCourseToTrack(track._id, course._id);

      expect((await Track.findById(a._id)).courses).toHaveLength(0);
      expect((await Track.findById(b._id)).courses).toHaveLength(0);
      expect(ids((await Track.findById(track._id)).courses)).toEqual([
        course._id.toString(),
      ]);
    });
  });

  describe('removeCourseFromTrack', () => {
    it('only cleans up this track when the course actually belongs to another track', async () => {
      const student = (await createTestUser({ role: 'student' })).user;
      await Track.updateOne(
        { _id: track._id },
        { $addToSet: { students: student._id } },
      );
      const other = await Track.create({
        title: 'Real Owner',
        description: 'Really owns the course',
        instructor: instructor._id,
      });
      const course = await makeCourse('Owned Elsewhere', {
        track: other._id,
        students: [student._id],
      });
      // A stale entry on `track`, plus other content so the removal is allowed.
      await Track.updateOne(
        { _id: track._id },
        {
          $addToSet: {
            courses: course._id,
            sessions: new mongoose.Types.ObjectId(),
          },
        },
      );

      await trackService.removeCourseFromTrack(track._id, course._id);

      expect((await Track.findById(track._id)).courses).toHaveLength(0);
      const after = await Course.findById(course._id);
      // still belongs to its real track, and its student was not unenrolled
      expect(after.track._id.toString()).toBe(other._id.toString());
      expect(ids(after.students)).toContain(student._id.toString());
    });
  });

  describe('deleting a track whose two sides are out of sync', () => {
    it('still detaches every session and course that points at it', async () => {
      // Desynced on purpose: the children point at the track, the track
      // lists none of them.
      const session = await makeSession('Orphan Candidate Session', {
        tracks: [track._id],
      });
      const course = await makeCourse('Orphan Candidate Course', {
        track: track._id,
      });
      const fresh = await Track.findById(track._id);
      expect(fresh.sessions).toHaveLength(0);
      expect(fresh.courses).toHaveLength(0);

      await trackService.deleteTrack(track._id, instructor._id);

      expect(await Track.findById(track._id)).toBeNull();
      const afterSession = await Session.findById(session._id);
      expect(afterSession.tracks).toHaveLength(0);
      expect(afterSession.isStandalone).toBe(true);
      const afterCourse = await Course.findById(course._id);
      expect(afterCourse.track).toBeNull();
    });
  });
});
