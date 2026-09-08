const mongoose = require('mongoose');
const cascade = require('../src/services/cascade.service');
const User = require('../src/models/user.model');
const Track = require('../src/models/track.model');
const Course = require('../src/models/course.model');
const Session = require('../src/models/session.model');
const { createTestUser } = require('./helpers/testUser');

describe('Cascade Service (Transactions)', () => {
  let user, instructor, track, course, session;

  beforeEach(async () => {
    user = (await createTestUser()).user;
    instructor = (await createTestUser({ role: 'instructor' })).user;
    track = await Track.create({
      title: 'Cascade Track',
      description: 'For testing cascade',
      instructor: instructor._id,
      published: true,
    });
    course = await Course.create({
      title: 'Cascade Course',
      description: 'Course inside track',
      instructor: instructor._id,
      track: track._id,
    });
    session = await Session.create({
      title: 'Cascade Session',
      instructor: instructor._id,
      tracks: [track._id],
    });
    await Track.findByIdAndUpdate(track._id, {
      $addToSet: { courses: course._id, sessions: session._id },
    });
  });

  it('syncUserEnrollments adds user to all courses and sessions in a track', async () => {
    await cascade.syncUserEnrollments(user._id, track._id);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.enrolledTrack.toString()).toBe(track._id.toString());
    expect(updatedUser.enrolledCourses.map((id) => id.toString())).toContain(
      course._id.toString(),
    );
    expect(updatedUser.enrolledSessions.map((id) => id.toString())).toContain(
      session._id.toString(),
    );

    const courseDoc = await Course.findById(course._id);
    expect(courseDoc.students.map((id) => id.toString())).toContain(
      user._id.toString(),
    );

    const sessionDoc = await Session.findById(session._id);
    expect(sessionDoc.students.map((id) => id.toString())).toContain(
      user._id.toString(),
    );
  });

  it('unsyncUserEnrollments removes user from all linked resources', async () => {
    await cascade.syncUserEnrollments(user._id, track._id);
    await cascade.unsyncUserEnrollments(user._id, track._id);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.enrolledTrack).toBeNull();
    expect(updatedUser.enrolledCourses).not.toContainEqual(course._id);
    expect(updatedUser.enrolledSessions).not.toContainEqual(session._id);

    const courseDoc = await Course.findById(course._id);
    expect(courseDoc.students).not.toContainEqual(user._id);

    const sessionDoc = await Session.findById(session._id);
    expect(sessionDoc.students).not.toContainEqual(user._id);
  });

  it('syncCourseEnrollment adds a user to a standalone course', async () => {
    const standaloneCourse = await Course.create({
      title: 'Standalone Course',
      description: 'Not in a track',
      instructor: instructor._id,
    });
    await cascade.syncCourseEnrollment(user._id, standaloneCourse._id);
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.enrolledCourses.map((id) => id.toString())).toContain(
      standaloneCourse._id.toString(),
    );
  });

  it('unsyncCourseEnrollment removes user from standalone course', async () => {
    const standaloneCourse = await Course.create({
      title: 'Standalone Course',
      description: 'Not in a track',
      instructor: instructor._id,
    });
    await cascade.syncCourseEnrollment(user._id, standaloneCourse._id);
    await cascade.unsyncCourseEnrollment(user._id, standaloneCourse._id);
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.enrolledCourses).not.toContainEqual(
      standaloneCourse._id,
    );
  });

  it('syncSessionEnrollment adds a user to a standalone session', async () => {
    const standaloneSession = await Session.create({
      title: 'Standalone Session',
      instructor: instructor._id,
    });
    await cascade.syncSessionEnrollment(user._id, standaloneSession._id);
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.enrolledSessions.map((id) => id.toString())).toContain(
      standaloneSession._id.toString(),
    );
  });

  it('unsyncSessionEnrollment removes user from standalone session', async () => {
    const standaloneSession = await Session.create({
      title: 'Standalone Session',
      instructor: instructor._id,
    });
    await cascade.syncSessionEnrollment(user._id, standaloneSession._id);
    await cascade.unsyncSessionEnrollment(user._id, standaloneSession._id);
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.enrolledSessions).not.toContainEqual(
      standaloneSession._id,
    );
  });
});
