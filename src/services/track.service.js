const User = require('../models/user.model');
const Track = require('../models/track.model');
const Course = require('../models/course.model');
const Session = require('../models/session.model');
const APIFeatures = require('../utils/APIFeatures');
const AppError = require('../utils/AppError');
const cascade = require('./cascade.service');

// ===================================================================
// 🎯 TRACK CRUD OPERATIONS
// ===================================================================

/**
 * Create a new track
 * @param {Object} trackBody - Track data including title, description, instructor
 * @returns {Promise<Track>} Newly created track
 * @throws {AppError} 400 if validation fails, 409 if title exists
 */
exports.createTrack = async (trackBody) => {
  const track = await Track.create(trackBody);
  return track;
};

/**
 * Get all tracks with advanced filtering, sorting, and pagination
 * @param {Object} query - Express query object with filters, sort, page, limit
 * @returns {Promise<{tracks: Array, total: Number}>} Paginated tracks and total count
 */
exports.getAllTracks = async (query) => {
  // Create features instance with the Track model
  const features = new APIFeatures(Track.find(), query, Track)
    .filter()
    .search(['title', 'description'])
    .sort()
    .limitFields();

  // ✅ AWAIT the async paginate method
  await features.paginate();

  // Execute the query and get results
  const tracks = await features.query;

  return {
    tracks: tracks || [], // Ensure it's always an array
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

  const isOwner = requestingUser?.id === track.instructor?._id?.toString();
  const isAdmin = requestingUser?.role === 'admin';
  const isEnrolled =
    requestingUser &&
    track.students?.some(
      (studentId) => studentId.toString() === requestingUser.id,
    );

  if (!track.published && !isOwner && !isAdmin) {
    throw new AppError('No track found with that ID', 404);
  }

  if (isOwner || isAdmin || isEnrolled) {
    await track.populate({ path: 'students', select: 'name email photo' });
  }

  return track;
};

/**
 * Update track information
 * @param {string} trackId - MongoDB track ID
 * @param {Object} updateBody - Fields to update
 * @returns {Promise<Track>} Updated track document
 * @throws {AppError} 404 if track not found, 400 if validation fails
 */
exports.updateTrack = async (trackId, updateBody) => {
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

  return track;
};

/**
 * Permanently delete a track. Courses are orphaned (track: null) and sessions
 * recalculate isStandalone; they are NOT cascade-deleted.
 * @param {string} trackId - MongoDB track ID
 * @returns {Promise<null>} Null on successful deletion
 * @throws {AppError} 404 if track not found
 */
exports.deleteTrack = async (trackId) => {
  const track = await Track.findById(trackId);
  if (!track) throw new AppError('No track found with that ID', 404);

  await Promise.all([
    Assignment.deleteMany({ track: trackId }),
    Review.deleteMany({ track: trackId }),
    WeeklyTask.deleteMany({ track: trackId }), // also deletes embedded completions
  ]);

  // Courses become standalone (no track)
  await Course.updateMany(
    { _id: { $in: track.courses } },
    { $set: { track: null } },
  );

  // Sessions become standalone if not in a course
  const sessionsInTrack = await Session.find({ _id: { $in: track.sessions } });
  for (const session of sessionsInTrack) {
    session.tracks.pull(trackId);
    session.isStandalone = !session.tracks?.length && !session.course;
    await session.save();
  }

  // Remove all track students from track courses and sessions
  if (track.students?.length) {
    if (track.courses?.length) {
      await Course.updateMany(
        { _id: { $in: track.courses } },
        { $pull: { students: { $in: track.students } } },
      );
    }
    if (track.sessions?.length) {
      await Session.updateMany(
        { _id: { $in: track.sessions } },
        { $pull: { students: { $in: track.students } } },
      );
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
    );
  }

  await Track.findByIdAndDelete(trackId);
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
