const User = require('../models/user.model');
const Track = require('../models/track.model');
const Course = require('../models/course.model');
const Session = require('../models/session.model');
const AppError = require('../utils/AppError');
const cascade = require('./cascade.service');

// ============================
// TRACK ENROLLMENT
// ============================

exports.requestTrackEnrollment = async (userId, trackId) => {
  const existing = await Track.findOne({
    $or: [{ students: userId }, { pendingStudents: userId }],
    _id: { $ne: trackId },
  });
  if (existing) {
    throw new AppError(
      'You can only apply to one track at a time. Leave your current track first.',
      400,
    );
  }

  const track = await Track.findById(trackId);
  if (!track) throw new AppError('No track found with that ID', 404);
  if (!track.published)
    throw new AppError('This track is not open for enrollment', 400);

  if (track.students.some((id) => id.toString() === userId)) {
    throw new AppError('You are already enrolled in this track', 400);
  }
  if (track.pendingStudents.some((id) => id.toString() === userId)) {
    throw new AppError('Your application is already pending approval', 400);
  }

  track.pendingStudents.push(userId);
  await track.save();
  return track;
};

exports.approveTrackEnrollment = async (trackId, studentId) => {
  const track = await Track.findById(trackId);
  if (!track) throw new AppError('No track found with that ID', 404);

  if (!track.pendingStudents.some((id) => id.toString() === studentId)) {
    throw new AppError('Student is not pending in this track', 400);
  }

  const existing = await Track.findOne({
    students: studentId,
    _id: { $ne: trackId },
  });
  if (existing) {
    throw new AppError(
      'Student is already enrolled in another track. Remove them first.',
      400,
    );
  }

  // Approve track
  track.pendingStudents.pull(studentId);
  track.students.push(studentId);
  await track.save();

  await cascade.syncUserEnrollments(studentId, trackId);

  return track;
};

// ============================
// TRACK LEAVING
// ============================

exports.requestTrackLeave = async (trackId, studentId) => {
  const track = await Track.findById(trackId);
  if (!track) throw new AppError('No track found with that ID', 404);
  if (!track.students.some((id) => id.toString() === studentId)) {
    throw new AppError('You are not enrolled in this track', 400);
  }
  if (track.pendingLeaves.some((id) => id.toString() === studentId)) {
    throw new AppError('Your leave request is already pending', 400);
  }

  track.pendingLeaves.push(studentId);
  await track.save();
  return track;
};

exports.approveTrackLeave = async (trackId, studentId) => {
  const track = await Track.findById(trackId);
  if (!track) throw new AppError('No track found with that ID', 404);
  if (!track.pendingLeaves.some((id) => id.toString() === studentId)) {
    throw new AppError('No pending leave request found', 400);
  }

  track.pendingLeaves.pull(studentId);
  track.students.pull(studentId);
  await track.save();

  await cascade.unsyncUserEnrollments(studentId, trackId);

  return track;
};

exports.rejectTrackLeave = async (trackId, studentId) => {
  const track = await Track.findById(trackId);
  if (!track) throw new AppError('No track found with that ID', 404);
  if (!track.pendingLeaves.some((id) => id.toString() === studentId)) {
    throw new AppError('No pending leave request found', 400);
  }

  track.pendingLeaves.pull(studentId);
  await track.save();
  return track;
};

exports.getPendingLeaves = async (trackId) => {
  const track = await Track.findById(trackId)
    .populate('pendingLeaves', 'name email photo role')
    .select('pendingLeaves title');
  if (!track) throw new AppError('No track found with that ID', 404);
  return track.pendingLeaves;
};

// ============================
// COURSE ENROLLMENT
// ============================

exports.enrollInCourse = async (userId, courseId) => {
  const course = await Course.findById(courseId);
  if (!course) throw new AppError('Course not found', 404);

  if (course.students.some((id) => id.toString() === userId)) {
    throw new AppError('You are already enrolled in this course', 400);
  }

  if (course.access === 'private') {
    throw new AppError(
      'This course requires instructor approval. You cannot self-enroll.',
      403,
    );
  }

  if (course.access === 'track-only') {
    if (!course.track) {
      throw new AppError('This course is not associated with any track', 400);
    }
    const track = await Track.findById(course.track);
    if (!track || !track.students.some((id) => id.toString() === userId)) {
      throw new AppError(
        'You must be enrolled in the parent track to access this course',
        403,
      );
    }
  }

  // Prerequisites check
  if (course.prerequisites?.length > 0) {
    const user = await User.findById(userId).select('enrolledCourses');
    const completed = user.enrolledCourses.map((id) => id.toString());
    const missing = course.prerequisites.filter(
      (prereq) => !completed.includes(prereq.toString()),
    );
    if (missing.length > 0) {
      throw new AppError(
        `You must complete prerequisites before enrolling. Missing: ${missing.length}`,
        403,
      );
    }
  }

  course.students.push(userId);
  await course.save();
  await User.findByIdAndUpdate(userId, {
    $addToSet: { enrolledCourses: courseId },
  });
  return course;
};

exports.leaveCourse = async (userId, courseId) => {
  const course = await Course.findById(courseId);
  if (!course) throw new AppError('Course not found', 404);
  if (!course.students.some((id) => id.toString() === userId)) {
    throw new AppError('You are not enrolled in this course', 400);
  }

  course.students.pull(userId);
  await course.save();
  await User.findByIdAndUpdate(userId, {
    $pull: { enrolledCourses: courseId },
  });
  return course;
};

// ============================
// SESSION ENROLLMENT
// ============================

exports.enrollInSession = async (userId, sessionId) => {
  const session = await Session.findById(sessionId);
  if (!session) throw new AppError('Session not found', 404);

  if (session.students.some((id) => id.toString() === userId)) {
    throw new AppError('You are already enrolled in this session', 400);
  }

  if (session.access === 'private') {
    throw new AppError(
      'This session requires instructor approval. You cannot self-enroll.',
      403,
    );
  }

  if (session.access === 'track-only') {
    const userTracks = await Track.find({ students: userId }).select('_id');
    const userTrackIds = userTracks.map((t) => t._id.toString());
    const inTrack = session.tracks?.some((t) =>
      userTrackIds.includes(t.toString()),
    );

    let inCourse = false;
    if (session.course) {
      const course = await Course.findById(session.course);
      inCourse = course?.students.some((id) => id.toString() === userId);
    }

    if (!inTrack && !inCourse) {
      throw new AppError(
        'You must be enrolled in the parent track or course to access this session',
        403,
      );
    }
  }

  session.students.push(userId);
  await session.save();
  await User.findByIdAndUpdate(userId, {
    $addToSet: { enrolledSessions: sessionId },
  });
  return session;
};

exports.leaveSession = async (userId, sessionId) => {
  const session = await Session.findById(sessionId);
  if (!session) throw new AppError('Session not found', 404);
  if (!session.students.some((id) => id.toString() === userId)) {
    throw new AppError('You are not enrolled in this session', 400);
  }

  session.students.pull(userId);
  await session.save();
  await User.findByIdAndUpdate(userId, {
    $pull: { enrolledSessions: sessionId },
  });
  return session;
};
