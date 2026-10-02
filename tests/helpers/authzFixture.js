const Track = require('../../src/models/track.model');
const Course = require('../../src/models/course.model');
const Session = require('../../src/models/session.model');
const Assignment = require('../../src/models/assignment.model');
const WeeklyTask = require('../../src/models/weeklytask.model');
const User = require('../../src/models/user.model');
const { createTestUser } = require('./testUser');

const FILE = 'https://drive.google.com/file/d/abc123/view';
let weekCounter = 0;

/**
 * Stage 4 authorization fixture. One published track T with:
 *   lead (Track.instructor), co (Track.instructors), demoted (listed in
 *   Track.instructors and instructor of DC, then demoted to a student),
 *   course C (instructor courseInst), session S (instructor sessionInst).
 * `former` created an assignment/weekly task on C but is NOT the course's
 * instructor and not track staff (a creator who lost authority).
 * `stranger` is an unrelated instructor who owns a standalone course/session.
 */
async function buildAuthzFixture() {
  const mk = (role) => createTestUser({ role });
  const [admin, lead, co, courseInst, sessionInst, former, stranger, demoted] =
    await Promise.all([
      mk('admin'),
      mk('instructor'),
      mk('instructor'),
      mk('instructor'),
      mk('instructor'),
      mk('instructor'),
      mk('instructor'),
      mk('instructor'),
    ]);
  const student = await mk('student');
  const pending = await mk('student');

  const track = await Track.create({
    title: 'Authz Track',
    description: 'Track used by the stage 4 authorization tests',
    instructor: lead.user._id,
    instructors: [co.user._id, demoted.user._id],
    published: true,
    students: [student.user._id],
    pendingStudents: [pending.user._id],
  });
  const course = await Course.create({
    title: 'Authz Course',
    description: 'Course inside the authz track',
    instructor: courseInst.user._id,
    track: track._id,
    students: [student.user._id],
    published: true,
  });
  const demotedCourse = await Course.create({
    title: 'Demoted Course',
    description: 'Course whose instructor gets demoted',
    instructor: demoted.user._id,
    track: track._id,
    published: true,
  });
  const session = await Session.create({
    title: 'Authz Session',
    instructor: sessionInst.user._id,
    tracks: [track._id],
    published: true,
  });
  await Track.updateOne(
    { _id: track._id },
    {
      $addToSet: {
        courses: { $each: [course._id, demotedCourse._id] },
        sessions: session._id,
      },
    },
  );

  const assignment = await Assignment.create({
    title: 'Authz Assignment',
    description: 'Created by someone who is no longer staff',
    deadline: new Date(Date.now() + 86400000),
    course: course._id,
    instructor: former.user._id,
    createdBy: former.user._id,
    submissions: [{ student: student.user._id, file: FILE }],
  });
  const task = await WeeklyTask.create({
    course: course._id,
    instructor: former.user._id,
    createdBy: former.user._id,
    week: 1,
    title: 'Authz Task',
    items: [{ title: 'Read chapter 1' }],
  });

  const standaloneCourse = await Course.create({
    title: 'Stranger Course',
    description: 'Standalone course of an unrelated instructor',
    instructor: stranger.user._id,
    published: true,
  });
  const standaloneSession = await Session.create({
    title: 'Stranger Session',
    instructor: stranger.user._id,
    published: true,
  });

  // Demote AFTER everything was set up: token stays valid, role does not.
  await User.updateOne({ _id: demoted.user._id }, { role: 'student' });

  const callers = {
    admin,
    lead,
    co,
    courseInst,
    sessionInst,
    former,
    stranger,
    demoted,
    student,
    anon: { token: null, user: null },
  };

  return {
    ...callers,
    callers,
    pending,
    track,
    course,
    demotedCourse,
    session,
    assignment,
    task,
    standaloneCourse,
    standaloneSession,
  };
}

// Fresh targets, so a destructive action can run once per caller.
const fresh = {
  async course(f, instructor, track = f.track) {
    const course = await Course.create({
      title: `Fresh Course ${Math.random().toString(36).slice(2, 8)}`,
      description: 'A fresh course for one action',
      instructor: instructor.user._id,
      track: track ? track._id : undefined,
      published: true,
    });
    if (track) {
      await Track.updateOne(
        { _id: track._id },
        { $addToSet: { courses: course._id } },
      );
    }
    return course;
  },
  async session(f, instructor, track = f.track) {
    const session = await Session.create({
      title: `Fresh Session ${Math.random().toString(36).slice(2, 8)}`,
      instructor: instructor.user._id,
      tracks: track ? [track._id] : [],
      published: true,
    });
    if (track) {
      await Track.updateOne(
        { _id: track._id },
        { $addToSet: { sessions: session._id } },
      );
    }
    return session;
  },
  assignmentOnCourse(f) {
    return Assignment.create({
      title: 'Fresh Assignment',
      description: 'A fresh assignment for one action',
      deadline: new Date(Date.now() + 86400000),
      course: f.course._id,
      instructor: f.former.user._id,
      createdBy: f.former.user._id,
      submissions: [{ student: f.student.user._id, file: FILE }],
    });
  },
  assignmentOnSession(f) {
    return Assignment.create({
      title: 'Fresh Session Assignment',
      description: 'A fresh assignment on a session',
      deadline: new Date(Date.now() + 86400000),
      session: f.session._id,
      instructor: f.former.user._id,
      createdBy: f.former.user._id,
      submissions: [{ student: f.student.user._id, file: FILE }],
    });
  },
  task(f) {
    weekCounter += 1;
    return WeeklyTask.create({
      course: f.course._id,
      instructor: f.former.user._id,
      createdBy: f.former.user._id,
      week: 100 + weekCounter,
      title: 'Fresh Task',
      items: [{ title: 'Fresh item' }],
    });
  },
};

module.exports = { buildAuthzFixture, fresh, FILE };
