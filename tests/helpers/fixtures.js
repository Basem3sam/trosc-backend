const Track = require('../../src/models/track.model');
const Course = require('../../src/models/course.model');
const Session = require('../../src/models/session.model');
const { createTestUser } = require('./testUser');

/**
 * A track with one course inside it. Returns an owning instructor, an
 * unrelated instructor (for ownership-rejection tests), and a student
 * already enrolled in the course. Used by any test that needs a
 * course-linked resource (reviews, assignments, weekly tasks).
 */
async function buildTrackAndCourseFixture() {
  const { user: instructor, token: instructorToken } = await createTestUser({
    role: 'instructor',
  });
  const { user: otherInstructor, token: otherInstructorToken } =
    await createTestUser({ role: 'instructor' });
  const { user: student, token: studentToken } = await createTestUser({
    role: 'student',
  });

  const track = await Track.create({
    title: 'Backend Track',
    description: 'Learn backend development',
    instructor: instructor._id,
  });

  const course = await Course.create({
    title: 'Node.js Fundamentals',
    description: 'Intro to Node.js',
    instructor: instructor._id,
    track: track._id,
    students: [student._id],
  });

  await Track.findByIdAndUpdate(track._id, {
    $addToSet: { courses: course._id },
  });

  return {
    instructor,
    instructorToken,
    otherInstructor,
    otherInstructorToken,
    student,
    studentToken,
    track,
    course,
  };
}

/**
 * A standalone session (not part of any course) with an enrolled student.
 * Used by tests exercising the session-scoped review/assignment routes.
 */
async function buildStandaloneSessionFixture() {
  const { user: instructor, token: instructorToken } = await createTestUser({
    role: 'instructor',
  });
  const { user: student, token: studentToken } = await createTestUser({
    role: 'student',
  });

  const session = await Session.create({
    title: 'Intro Webinar',
    instructor: instructor._id,
    students: [student._id],
  });

  return { instructor, instructorToken, student, studentToken, session };
}

module.exports = { buildTrackAndCourseFixture, buildStandaloneSessionFixture };
