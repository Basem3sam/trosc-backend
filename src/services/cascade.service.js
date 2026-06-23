const User = require('../models/user.model');
const Track = require('../models/track.model');
const Course = require('../models/course.model');
const Session = require('../models/session.model');
const AppError = require('../utils/AppError');

// Called when a student joins a track (self-approve or instructor add)
exports.syncUserEnrollments = async (userId, trackId) => {
  const [trackCourses, trackSessions] = await Promise.all([
    Course.find({ track: trackId }),
    Session.find({ tracks: trackId }),
  ]);

  const courseIds = trackCourses.map((c) => c._id);
  const sessionIds = trackSessions.map((s) => s._id);

  await Promise.all([
    Course.updateMany(
      { _id: { $in: courseIds }, students: { $ne: userId } },
      { $push: { students: userId } },
    ),
    Session.updateMany(
      { _id: { $in: sessionIds }, students: { $ne: userId } },
      { $push: { students: userId } },
    ),
    User.findByIdAndUpdate(userId, {
      $addToSet: {
        enrolledTracks: trackId,
        enrolledCourses: { $each: courseIds },
        enrolledSessions: { $each: sessionIds },
      },
    }),
  ]);
};

// Called when a student leaves a track (approve leave or instructor kick)
exports.unsyncUserEnrollments = async (userId, trackId) => {
  // Centralized one-track guard (runs for any update method)
  const existingTrack = await Track.findOne({
    students: userId,
    _id: { $ne: trackId },
  });
  if (existingTrack) {
    throw new AppError('User can only be enrolled in one track at a time', 400);
  }

  const [trackCourses, trackSessions] = await Promise.all([
    Course.find({ track: trackId }),
    Session.find({ tracks: trackId }),
  ]);

  const courseIds = trackCourses.map((c) => c._id);
  const sessionIds = trackSessions.map((s) => s._id);

  await Promise.all([
    Course.updateMany(
      { _id: { $in: courseIds } },
      { $pull: { students: userId } },
    ),
    Session.updateMany(
      { _id: { $in: sessionIds } },
      { $pull: { students: userId } },
    ),
    User.findByIdAndUpdate(userId, {
      $pull: {
        enrolledTracks: trackId,
        enrolledCourses: { $in: courseIds },
        enrolledSessions: { $in: sessionIds },
      },
    }),
  ]);
};

// Called when instructor manually adds student to a standalone course
exports.syncCourseEnrollment = async (userId, courseId) => {
  await User.findByIdAndUpdate(userId, {
    $addToSet: { enrolledCourses: courseId },
  });
};

// Called when instructor manually removes student from a standalone course
exports.unsyncCourseEnrollment = async (userId, courseId) => {
  await User.findByIdAndUpdate(userId, {
    $pull: { enrolledCourses: courseId },
  });
};

// Called when instructor manually adds student to a standalone session
exports.syncSessionEnrollment = async (userId, sessionId) => {
  await User.findByIdAndUpdate(userId, {
    $addToSet: { enrolledSessions: sessionId },
  });
};

// Called when instructor manually removes student from a standalone session
exports.unsyncSessionEnrollment = async (userId, sessionId) => {
  await User.findByIdAndUpdate(userId, {
    $pull: { enrolledSessions: sessionId },
  });
};
