const mongoose = require('mongoose');
const User = require('../models/user.model');
const Track = require('../models/track.model');
const Course = require('../models/course.model');
const Session = require('../models/session.model');
const Assignment = require('../models/assignment.model');
const Review = require('../models/review.model');
const WeeklyTask = require('../models/weeklytask.model');
const AppError = require('../utils/AppError');

// Called when a student joins a track (self-approve or instructor add)
exports.syncUserEnrollments = async (userId, trackId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const trackCourses = await Course.find({ track: trackId }).session(session);
    const trackSessions = await Session.find({ tracks: trackId }).session(
      session,
    );

    const courseIds = trackCourses.map((c) => c._id);
    const sessionIds = trackSessions.map((s) => s._id);

    // These must run sequentially, not via Promise.all: a single
    // ClientSession can only have one operation in flight at a time, so
    // firing concurrent writes against the same session risks intermittent
    // "operation in progress" errors under load.
    await Course.updateMany(
      { _id: { $in: courseIds }, students: { $ne: userId } },
      { $push: { students: userId } },
    ).session(session);
    await Session.updateMany(
      { _id: { $in: sessionIds }, students: { $ne: userId } },
      { $push: { students: userId } },
    ).session(session);
    await User.findByIdAndUpdate(
      userId,
      {
        $set: { enrolledTrack: trackId },
        $addToSet: {
          enrolledCourses: { $each: courseIds },
          enrolledSessions: { $each: sessionIds },
        },
      },
      { session },
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Called when a student leaves a track (approve leave or instructor kick)
exports.unsyncUserEnrollments = async (userId, trackId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const trackCourses = await Course.find({ track: trackId }).session(session);
    const trackSessions = await Session.find({ tracks: trackId }).session(
      session,
    );

    const courseIds = trackCourses.map((c) => c._id);
    const sessionIds = trackSessions.map((s) => s._id);

    // Sequential for the same reason as syncUserEnrollments above: one
    // ClientSession, one operation in flight at a time.
    await Course.updateMany(
      { _id: { $in: courseIds } },
      { $pull: { students: userId } },
    ).session(session);
    await Session.updateMany(
      { _id: { $in: sessionIds } },
      { $pull: { students: userId } },
    ).session(session);
    await User.findByIdAndUpdate(
      userId,
      {
        $unset: { enrolledTrack: 1 },
        $pull: {
          enrolledCourses: { $in: courseIds },
          enrolledSessions: { $in: sessionIds },
        },
      },
      { session },
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
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

// Called when a track is deleted. Wipes track-scoped assignments/weekly
// tasks/reviews, detaches the track's courses and sessions (they become
// standalone rather than being deleted themselves), unenrolls every track
// student from those courses/sessions, and finally removes the track
// document itself — all inside one transaction so a failure partway
// through can't leave courses/sessions/users out of sync with a
// half-deleted (or fully deleted) track.
exports.deleteTrackCascade = async (trackId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const track = await Track.findById(trackId).session(session);
    if (!track) {
      throw new AppError('No track found with that ID', 404);
    }

    // Sequential for the same reason as the sync/unsync helpers above: one
    // ClientSession, one operation in flight at a time.
    await Assignment.deleteMany({
      $or: [
        { course: { $in: track.courses } },
        { session: { $in: track.sessions } },
      ],
    }).session(session);

    await WeeklyTask.deleteMany({ course: { $in: track.courses } }).session(
      session,
    );

    await Review.deleteMany({ track: trackId }).session(session); // Review does have a track field

    // Courses become standalone (no track)
    await Course.updateMany(
      { _id: { $in: track.courses } },
      { $set: { track: null } },
    ).session(session);

    // Sessions become standalone if not in a course
    const sessionsInTrack = await Session.find({
      _id: { $in: track.sessions },
    }).session(session);
    for (const trackSession of sessionsInTrack) {
      trackSession.tracks.pull(trackId);
      trackSession.isStandalone =
        !trackSession.tracks?.length && !trackSession.course;
      await trackSession.save({ session });
    }

    // Remove all track students from track courses and sessions
    if (track.students?.length) {
      if (track.courses?.length) {
        await Course.updateMany(
          { _id: { $in: track.courses } },
          { $pull: { students: { $in: track.students } } },
        ).session(session);
      }
      if (track.sessions?.length) {
        await Session.updateMany(
          { _id: { $in: track.sessions } },
          { $pull: { students: { $in: track.students } } },
        ).session(session);
      }
    }

    // Clean up User enrollments ONLY for actual track students
    if (track.students?.length) {
      await User.updateMany(
        { _id: { $in: track.students } },
        {
          $unset: { enrolledTrack: 1 },
          $pull: {
            enrolledCourses: { $in: track.courses || [] },
            enrolledSessions: { $in: track.sessions || [] },
          },
        },
      ).session(session);
    }

    await Track.findByIdAndDelete(trackId).session(session);

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
