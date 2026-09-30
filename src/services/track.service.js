const User = require('../models/user.model');
const Track = require('../models/track.model');
const Course = require('../models/course.model');
const Session = require('../models/session.model');
const APIFeatures = require('../utils/APIFeatures');
const AppError = require('../utils/AppError');
const cascade = require('./cascade.service');
const policy = require('./policy.service');
const { logActivity } = require('./activityLog.service');

// ===================================================================
// 🎯 TRACK CRUD OPERATIONS
// ===================================================================

/**
 * Confirms `instructorId` refers to an existing user whose role is
 * 'instructor' or 'admin'. Only reached when an admin explicitly set
 * `instructor` in the request body (see track.controller.js) — the
 * default case (no instructor in the body) skips this entirely.
 * @throws {AppError} 400 if the user doesn't exist or has the wrong role
 */
async function assertValidInstructor(instructorId) {
  const user = await User.findById(instructorId).select('role');
  if (!user) {
    throw new AppError('No user found with that instructor ID', 400);
  }
  if (!['instructor', 'admin'].includes(user.role)) {
    throw new AppError(
      'Instructor must be a user with role "instructor" or "admin"',
      400,
    );
  }
}

/**
 * Create a new track
 * @param {Object} trackBody - Track data including title, description, instructor
 * @returns {Promise<Track>} Newly created track
 * @throws {AppError} 400 if validation fails, 409 if title exists
 */
exports.createTrack = async (trackBody, requestingUserId) => {
  if (trackBody.instructor && trackBody.instructor !== requestingUserId) {
    await assertValidInstructor(trackBody.instructor);
  }

  const track = await Track.create(trackBody);
  await logActivity({
    userId: requestingUserId,
    action: 'created_track',
    targetModel: 'Track',
    targetId: track._id,
  });
  return track;
};

/**
 * Get all tracks with advanced filtering, sorting, and pagination
 * @param {Object} query - Express query object with filters, sort, page, limit
 * @returns {Promise<{tracks: Array, total: Number}>} Paginated tracks and total count
 */
exports.getAllTracks = async (query, requestingUser = null) => {
  // Q5/Q2: previously returned every track regardless of `published`,
  // to any caller including anonymous — a draft "[TEST]" track's title
  // was fully public. Admins see everything; everyone else sees
  // published tracks plus any drafts they themselves own.
  const features = new APIFeatures(Track.find(), query, Track)
    .filter(policy.publishedListFilter(requestingUser))
    .search(['title', 'description'])
    .sort()
    .limitFields();

  // ✅ AWAIT the async paginate method
  await features.paginate();

  // Execute the query and get results
  const tracks = await features.query;

  // Q7: previously returned every track's raw `students`/`pendingStudents`/
  // `pendingLeaves` ID arrays to literally any caller, including
  // anonymous — replaced with `studentCount` (already a schema virtual)
  // plus `isEnrolled`/`isPending`/`isPendingLeave` for the requester.
  // Each track's own instructor (or an admin) still gets the full arrays.
  const sanitized = tracks.map((t) => {
    const obj = t.toObject();
    const isStaff =
      policy.isAdmin(requestingUser) ||
      policy.isOwnerOf(obj, requestingUser, 'instructor');
    return policy.redactMembership(obj, requestingUser, isStaff, {
      isEnrolled: 'students',
      isPending: 'pendingStudents',
      isPendingLeave: 'pendingLeaves',
    });
  });

  return {
    tracks: sanitized || [], // Ensure it's always an array
    total: features.totalDocs || 0,
    pagination: features.pagination, // Include pagination info
  };
};

/**
 * Get a single track by ID with optional session population
 * @param {string} trackId - MongoDB track ID
 * @param {boolean} populateSessions - Whether to populate sessions
 * @returns {Promise<Track>} Track document
 * @throws {AppError} 404 if track not found
 */
exports.getTrackById = async (trackId, populateSessions = false) => {
  let query = Track.findById(trackId);

  if (populateSessions) {
    query = query.populate({
      path: 'sessions',
      select: 'title description duration level published startDate',
      match: { published: true },
    });
  }

  const track = await query;
  if (!track) {
    throw new AppError('No track found with that ID', 404);
  }
  return track;
};

/**
 * Get detailed track information with full population
 * @param {string} trackId - MongoDB track ID
 * @returns {Promise<Track>} Fully populated track with sessions and students
 * @throws {AppError} 404 if track not found
 */
exports.getTrackDetails = async (trackId, requestingUser = null) => {
  const track = await Track.findById(trackId)
    .populate({
      path: 'courses',
      select: 'title description level',
      match: { published: true },
    })
    .populate({
      path: 'sessions',
      select: 'title description duration level published startDate students',
      match: { published: true },
    });

  if (!track) {
    throw new AppError('No track found with that ID', 404);
  }

  const isOwner = policy.isOwnerOf(track, requestingUser, 'instructor');
  const isAdmin = policy.isAdmin(requestingUser);
  const isEnrolled = policy.isMemberOf(track.students, requestingUser);

  if (!track.published && !isOwner && !isAdmin) {
    throw new AppError('No track found with that ID', 404);
  }

  if (isOwner || isAdmin || isEnrolled) {
    await track.populate({ path: 'students', select: 'name email photo' });
  }

  // Q7: `pendingStudents`/`pendingLeaves` had NO gate at all before this —
  // anyone who could see the track (including an enrolled-but-not-staff
  // student) got the raw applicant/leave-request ID lists. Only the
  // track's own instructor or an admin is "staff" for these two fields —
  // being merely enrolled doesn't qualify, unlike for `students` above.
  // Everyone else gets `isPending`/`isPendingLeave` for their own status
  // instead. `students`, when NOT populated above (i.e. the caller is
  // none of owner/admin/enrolled), still needs the same raw-ID-array fix
  // `getAllTracks` already got — replaced with `studentCount` (schema
  // virtual, already present) + `isEnrolled: false`.
  const trackObj = track.toObject();
  trackObj.isEnrolled = isEnrolled;
  policy.redactMembership(trackObj, requestingUser, isOwner || isAdmin, {
    isPending: 'pendingStudents',
    isPendingLeave: 'pendingLeaves',
  });
  if (!(isOwner || isAdmin || isEnrolled)) {
    delete trackObj.students;
  }

  return trackObj;
};

/**
 * Update track information
 * @param {string} trackId - MongoDB track ID
 * @param {Object} updateBody - Fields to update
 * @returns {Promise<Track>} Updated track document
 * @throws {AppError} 404 if track not found, 400 if validation fails
 */
/**
 * #1.2: public catalog of a track's sessions, no media/URLs — just enough
 * for a visitor to see what the track covers before enrolling.
 * @param {string} trackId
 * @returns {Promise<Object[]>} sessions: [{ _id, title, description, startDate, duration }]
 * @throws {AppError} 404 if the track doesn't exist
 */
exports.getSessionCatalog = async (trackId) => {
  const track = await Track.findById(trackId).select('_id');
  if (!track) {
    throw new AppError('No track found with that ID', 404);
  }

  const sessions = await Session.find({ tracks: trackId }).select(
    'title description startDate duration',
  );

  return sessions;
};

exports.updateTrack = async (trackId, updateBody, requestingUserId) => {
  if (updateBody.instructor) {
    await assertValidInstructor(updateBody.instructor);
  }

  // If the update touches courses or sessions, validate BEFORE saving
  if (updateBody.courses !== undefined || updateBody.sessions !== undefined) {
    const existing = await Track.findById(trackId);
    if (!existing) throw new AppError('No track found with that ID', 404);

    const mergedCourses = updateBody.courses ?? existing.courses;
    const mergedSessions = updateBody.sessions ?? existing.sessions;

    if (mergedCourses.length === 0 && mergedSessions.length === 0) {
      throw new AppError(
        'A track must have at least one course or one session',
        400,
      );
    }
  }

  const track = await Track.findById(trackId);

  if (!track) throw new AppError('No track found', 404);

  track.set(updateBody);

  await track.save(); // triggers pre('save') validation

  await track.populate({ path: 'instructor', select: 'name email role photo' });

  await logActivity({
    userId: requestingUserId,
    action: 'updated_track',
    targetModel: 'Track',
    targetId: trackId,
  });

  return track;
};

/**
 * Permanently delete a track. Courses are orphaned (track: null) and sessions
 * recalculate isStandalone; they are NOT cascade-deleted.
 * @param {string} trackId - MongoDB track ID
 * @returns {Promise<null>} Null on successful deletion
 * @throws {AppError} 404 if track not found
 */
exports.deleteTrack = async (trackId, requestingUserId) => {
  // Delegates to cascade.service's transactional implementation: deleting a
  // track touches assignments, weekly tasks, reviews, courses, sessions,
  // and every enrolled student's user document, so it needs to be all-or-
  // nothing rather than a sequence of independent writes.
  await cascade.deleteTrackCascade(trackId);
  await logActivity({
    userId: requestingUserId,
    action: 'deleted_track',
    targetModel: 'Track',
    targetId: trackId,
  });
  return null;
};

// ===================================================================
// 🔗 COURSE-TRACK RELATIONSHIP MANAGEMENT
// ===================================================================

exports.addCourseToTrack = async (trackId, courseId) => {
  const [track, course] = await Promise.all([
    Track.findById(trackId),
    Course.findById(courseId),
  ]);

  if (!track) throw new AppError('No track found', 404);
  if (!course) throw new AppError('No course found', 404);

  if (track.courses.some((id) => id.toString() === courseId)) {
    throw new AppError('Course already in this track', 400);
  }

  // If the course already belongs to a different track, detach it from
  // that track's `courses` array first. Otherwise the old track keeps a
  // stale reference: `course.track` would point here, but the old track's
  // `courses` array would still list it too — and anything that trusts
  // that array (e.g. deleteTrack orphaning its courses) would wrongly act
  // on a course it no longer owns.
  if (course.track && course.track.toString() !== trackId) {
    await Track.findByIdAndUpdate(course.track, {
      $pull: { courses: courseId },
    });
  }

  // Update both sides
  track.courses.push(courseId);
  course.track = trackId;

  await Promise.all([track.save(), course.save()]);

  // Enroll existing track students into the new course
  if (track.students?.length) {
    await Course.findByIdAndUpdate(courseId, {
      $addToSet: { students: { $each: track.students } },
    });
    await User.updateMany(
      { _id: { $in: track.students } },
      { $addToSet: { enrolledCourses: courseId } },
    );
  }

  return track;
};

/**
 * Add a session to a track with validation
 * @param {string} trackId - MongoDB track ID
 * @param {string} sessionId - MongoDB session ID
 * @returns {Promise<Track>} Updated track with new session
 * @throws {AppError} 404 if track/session not found, 400 if invalid operation
 */
exports.addSessionToTrack = async (trackId, sessionId) => {
  const [track, session] = await Promise.all([
    Track.findById(trackId),
    Session.findById(sessionId),
  ]);

  if (!track) throw new AppError('No track found', 404);
  if (!session) throw new AppError('No session found', 404);

  if (track.sessions.some((id) => id.toString() === sessionId)) {
    throw new AppError('Session already in this track', 400);
  }

  track.sessions.push(sessionId);
  session.tracks.push(trackId);
  session.isStandalone = !session.tracks.length && !session.course;

  await Promise.all([track.save(), session.save()]);

  // Enroll existing track students into the new session
  if (track.students?.length) {
    await Session.findByIdAndUpdate(sessionId, {
      $addToSet: { students: { $each: track.students } },
    });
    await User.updateMany(
      { _id: { $in: track.students } },
      { $addToSet: { enrolledSessions: sessionId } },
    );
  }

  return track;
};

exports.removeCourseFromTrack = async (trackId, courseId) => {
  const track = await Track.findById(trackId);
  if (!track) throw new AppError('No track found', 404);

  track.courses.pull(courseId);

  // Check: track still has content?
  if (track.courses.length === 0 && track.sessions.length === 0) {
    throw new AppError(
      'Cannot remove last course: track must have at least one course or session',
      400,
    );
  }

  const course = await Course.findById(courseId);
  if (course) {
    course.track = null; // Orphan the course
    await course.save();

    // Unenroll the track's current students from the now-detached course —
    // symmetric with addCourseToTrack, which auto-enrolls existing track
    // students into a course when it's added. Without this, students stay
    // enrolled in a course that's no longer gated behind the track they
    // joined, with no way to notice or clean it up.
    //
    // Known limitation: a student who is both a track member *and*
    // separately/directly enrolled in this exact course will also be
    // unenrolled here, since enrollment doesn't currently record *how* a
    // student got access (track vs. direct). Fixing that fully needs a
    // provenance field on enrollment — a larger, separately-tracked change.
    if (track.students?.length) {
      await Course.findByIdAndUpdate(courseId, {
        $pull: { students: { $in: track.students } },
      });
      await User.updateMany(
        { _id: { $in: track.students } },
        { $pull: { enrolledCourses: courseId } },
      );
    }
  }

  await track.save();
  return track;
};

/**
 * Remove a session from a track
 * @param {string} trackId - MongoDB track ID
 * @param {string} sessionId - MongoDB session ID
 * @returns {Promise<Track>} Updated track without the session
 * @throws {AppError} 404 if track/session not found, 400 if session not in track
 */
exports.removeSessionFromTrack = async (trackId, sessionId) => {
  const track = await Track.findById(trackId);
  if (!track) throw new AppError('No track found', 404);

  track.sessions.pull(sessionId);

  // Check: track still has content?
  if (track.courses.length === 0 && track.sessions.length === 0) {
    throw new AppError(
      'Cannot remove last session: track must have at least one course or session',
      400,
    );
  }

  const session = await Session.findById(sessionId);
  if (session) {
    session.tracks.pull(trackId);
    session.isStandalone = !session.tracks.length && !session.course; // true if also not in a course
    await session.save();

    // Unenroll this track's current students from the session — symmetric
    // with addSessionToTrack, which auto-enrolls existing track students
    // into a session when it's added. Without this, students stay
    // enrolled in a session that's no longer reachable via the track they
    // joined, with no way to notice or clean it up.
    //
    // Known limitation: a student who is both a track member *and*
    // separately/directly enrolled in this exact session will also be
    // unenrolled here, since enrollment doesn't currently record *how* a
    // student got access (track vs. direct). Fixing that fully needs a
    // provenance field on enrollment — a larger, separately-tracked change.
    if (track.students?.length) {
      await Session.findByIdAndUpdate(sessionId, {
        $pull: { students: { $in: track.students } },
      });
      await User.updateMany(
        { _id: { $in: track.students } },
        { $pull: { enrolledSessions: sessionId } },
      );
    }
  }

  await track.save();
  return track;
};

// ===================================================================
// 🔍 ADVANCED QUERIES & ANALYTICS
// ===================================================================

/**
 * Get all tracks created by a specific instructor
 * @param {string} instructorId - MongoDB user ID (instructor)
 * @param {Object} query - Filtering and pagination options
 * @returns {Promise<{tracks: Array, total: Number}>} Instructor's tracks
 */
exports.getTracksByInstructor = async (instructorId, query) => {
  const features = new APIFeatures(Track.find(), query, Track)
    .filter({ instructor: instructorId })
    .search(['title', 'description'])
    .sort()
    .limitFields();

  await features.paginate();

  const tracks = await features.query;

  return {
    tracks,
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};

/**
 * Get all tracks a student is enrolled in
 * @param {string} studentId - MongoDB user ID (student)
 * @param {Object} query - Filtering and pagination options
 * @returns {Promise<{tracks: Array, total: Number}>} Student's enrolled tracks
 */
exports.getTracksByStudent = async (studentId, query) => {
  const features = new APIFeatures(Track.find(), query, Track)
    .filter({ students: studentId })
    .search(['title', 'description'])
    .sort()
    .limitFields();

  await features.paginate();

  const tracks = await features.query;

  return {
    tracks,
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};

/**
 * Get most popular tracks based on student enrollment count
 * @param {number} limit - Number of tracks to return (default: 10)
 * @returns {Promise<Array>} Array of popular tracks with instructor data
 */
exports.getPopularTracks = async (limit = 10) => {
  const tracks = await Track.aggregate([
    {
      $addFields: {
        studentCount: { $size: '$students' },
      },
    },
    {
      $match: {
        published: true,
        studentCount: { $gt: 0 },
      },
    },
    {
      $sort: { studentCount: -1 },
    },
    {
      $limit: limit,
    },
    {
      $lookup: {
        from: 'users',
        localField: 'instructor',
        foreignField: '_id',
        as: 'instructor',
      },
    },
    {
      $unwind: '$instructor',
    },
    {
      $project: {
        'instructor.password': 0,
        'instructor.passwordChangedAt': 0,
        'instructor.passwordResetToken': 0,
        'instructor.passwordResetExpires': 0,
        // Q7: this endpoint is fully public (no auth on the route, no
        // requestingUser param here to compute isEnrolled/isPending
        // against) — an aggregation pipeline also bypasses Mongoose's
        // toObject()/virtuals machinery entirely, so `policy.
        // redactMembership()` doesn't apply here the way it does for
        // getAllTracks/getTrackDetails. studentCount was already added
        // above via $addFields; the raw arrays are unconditionally
        // excluded since there's no legitimate "staff" viewer of a
        // public leaderboard endpoint.
        students: 0,
        pendingStudents: 0,
        pendingLeaves: 0,
      },
    },
  ]);

  return tracks;
};

/**
 * Get track statistics and analytics
 * @param {string} trackId - MongoDB track ID
 * @returns {Promise<Object>} Track analytics including completion rates, engagement
 */
exports.getTrackAnalytics = async (trackId) => {
  const track = await Track.findById(trackId);
  if (!track) {
    throw new AppError('No track found with that ID', 404);
  }

  // Basic analytics - can be enhanced with more complex aggregations
  const analytics = {
    totalStudents: track.students.length,
    totalSessions: track.sessions.length,
    enrollmentRate: track.students.length, // Could be compared to platform average
    completionRate: 0, // Would require session completion tracking
    averageEngagement: 0, // Would require engagement metrics
  };

  return analytics;
};
