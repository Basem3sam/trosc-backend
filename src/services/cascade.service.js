const mongoose = require('mongoose');
const User = require('../models/user.model');
const Track = require('../models/track.model');
const Course = require('../models/course.model');
const Session = require('../models/session.model');
const Assignment = require('../models/assignment.model');
const Review = require('../models/review.model');
const WeeklyTask = require('../models/weeklytask.model');
const Event = require('../models/event.model');
const Announcement = require('../models/announcement.model');
const AppError = require('../utils/AppError');

// Called when a student joins a track (self-approve or instructor add)
exports.syncUserEnrollments = async (userId, trackId) => {
  const trackExists = await Track.exists({ _id: trackId });
  if (!trackExists) {
    throw new AppError('No track found with that ID', 404);
  }

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

    // Sessions can belong to MULTIPLE tracks (Session.tracks is an
    // array), unlike courses (Course.track is a single ref). Fetch them
    // up front so the assignment purge below can tell "session is
    // exclusively scoped to this track" (safe to wipe its assignments)
    // apart from "session also belongs to another track or still has a
    // course" (that session — and its assignments — survive this
    // delete, they just lose this track's reference).
    const sessionsInTrack = await Session.find({
      _id: { $in: track.sessions },
    }).session(session);

    const orphanedSessionIds = sessionsInTrack
      .filter((s) => {
        const remainingTracks = s.tracks.filter(
          (t) => t.toString() !== trackId.toString(),
        );
        return remainingTracks.length === 0 && !s.course;
      })
      .map((s) => s._id);

    // Sequential for the same reason as the sync/unsync helpers above: one
    // ClientSession, one operation in flight at a time.
    await Assignment.deleteMany({
      $or: [
        { course: { $in: track.courses } },
        { session: { $in: orphanedSessionIds } },
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

    // Sessions become standalone if not in a course.
    // Sequential for the same reason as every other write against this
    // ClientSession in this file: one session, one operation in flight
    // at a time. This used to run via Promise.all, which fired
    // concurrent .save({ session }) calls against the same ClientSession
    // and could intermittently throw "operation in progress" for tracks
    // with more than one standalone session.
    // eslint-disable-next-line no-restricted-syntax
    for (const trackSession of sessionsInTrack) {
      trackSession.tracks.pull(trackId);
      trackSession.isStandalone =
        !trackSession.tracks?.length && !trackSession.course;
      // eslint-disable-next-line no-await-in-loop
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

    // T5: Event.track and Announcement.targetTrack are optional refs —
    // not required, so they don't block the delete, but leaving them
    // dangling produces populated-null responses and confusing UI.
    await Event.updateMany(
      { track: trackId },
      { $set: { track: null } },
    ).session(session);
    await Announcement.updateMany(
      { targetTrack: trackId },
      { $set: { targetTrack: null } },
    ).session(session);

    await Track.findByIdAndDelete(trackId).session(session);

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Called by user.service.js#deleteUser / #bulkUserAction. Design decision
// (see the E1 design doc): Course.instructor, Track.instructor,
// Event.createdBy, and Announcement.createdBy are all `required` fields
// in their schemas, so they can't simply be nulled out — a deleted user
// who still owns one of those is a real conflict, not something a
// cascade can silently resolve. Block the delete and tell the caller
// what needs reassigning first, same as the "track must keep a
// course/session" guard elsewhere in this file. Review.user is also
// required, but a review has no standalone meaning without its author,
// so those are deleted outright rather than blocking. Everything else
// below is a non-required array membership and gets pulled.
// Called by user.service.js#deleteUser / #bulkUserAction. Design decision
// (see the E1 design doc): Course.instructor, Track.instructor,
// Event.createdBy, Announcement.createdBy, Session.instructor,
// Assignment.instructor, and WeeklyTask.instructor are all `required`
// fields in their schemas, so they can't simply be nulled out — a
// deleted user who still owns one of those is a real conflict, not
// something a cascade can silently resolve. Block the delete and tell
// the caller what needs reassigning first, same as the "track must keep
// a course/session" guard elsewhere in this file. Review.user is also
// required, but a review has no standalone meaning without its author,
// so those are deleted outright rather than blocking. Everything else
// below is a non-required array membership and gets pulled.
exports.hardDeleteUserCascade = async (userId) => {
  const [
    ownedCourses,
    ownedTracks,
    ownedEvents,
    ownedAnnouncements,
    ownedSessions,
    ownedAssignments,
    ownedWeeklyTasks,
  ] = await Promise.all([
    Course.find({ instructor: userId }).select('_id title'),
    Track.find({ instructor: userId }).select('_id title'),
    Event.find({ createdBy: userId }).select('_id title'),
    Announcement.find({ createdBy: userId }).select('_id title'),
    Session.find({ instructor: userId }).select('_id title'),
    Assignment.find({ instructor: userId }).select('_id title'),
    WeeklyTask.find({ instructor: userId }).select('_id week'),
  ]);

  if (
    ownedCourses.length ||
    ownedTracks.length ||
    ownedEvents.length ||
    ownedAnnouncements.length ||
    ownedSessions.length ||
    ownedAssignments.length ||
    ownedWeeklyTasks.length
  ) {
    throw new AppError(
      'This user is the required instructor/creator of existing content ' +
        `(${ownedCourses.length} course(s), ${ownedTracks.length} track(s), ` +
        `${ownedEvents.length} event(s), ${ownedAnnouncements.length} ` +
        `announcement(s), ${ownedSessions.length} session(s), ` +
        `${ownedAssignments.length} assignment(s), ${ownedWeeklyTasks.length} ` +
        'weekly task(s)). Reassign that content to another user before ' +
        'deleting this account.',
      409,
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await Course.updateMany(
      { students: userId },
      { $pull: { students: userId } },
    ).session(session);
    await Track.updateMany(
      { students: userId },
      { $pull: { students: userId } },
    ).session(session);
    await Session.updateMany(
      { students: userId },
      { $pull: { students: userId } },
    ).session(session);
    await Assignment.updateMany(
      { 'submissions.student': userId },
      { $pull: { submissions: { student: userId } } },
    ).session(session);
    await WeeklyTask.updateMany(
      { 'completions.student': userId },
      { $pull: { completions: { student: userId } } },
    ).session(session);
    await Event.updateMany(
      { attendees: userId },
      { $pull: { attendees: userId } },
    ).session(session);
    // No standalone meaning without their author — delete outright
    // rather than leave a required field unset.
    await Review.deleteMany({ user: userId }).session(session);

    await User.findByIdAndDelete(userId).session(session);

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
