const Track = require('../models/track.model');
const Session = require('../models/session.model');
const APIFeatures = require('../utils/APIFeatures');
const AppError = require('../utils/AppError');

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
    .sort()
    .limitFields();

  // ✅ AWAIT the async paginate method
  await features.paginate();

  // Execute the query and get results
  const tracks = await features.query;

  return {
    tracks: tracks || [], // Ensure it's always an array
    total: features.totalDocs || 0,
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
exports.getTrackDetails = async (trackId) => {
  const track = await Track.findById(trackId)
    .populate({
      path: 'sessions',
      select: 'title description duration level published startDate students',
      match: { published: true },
    })
    .populate({
      path: 'students',
      select: 'name email photo',
    });

  if (!track) {
    throw new AppError('No track found with that ID', 404);
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
  const track = await Track.findByIdAndUpdate(trackId, updateBody, {
    new: true,
    runValidators: true,
  });

  if (!track) {
    throw new AppError('No track found with that ID', 404);
  }
  return track;
};

/**
 * Permanently delete a track and handle related sessions
 * @param {string} trackId - MongoDB track ID
 * @returns {Promise<null>} Null on successful deletion
 * @throws {AppError} 404 if track not found
 */
exports.deleteTrack = async (trackId) => {
  const track = await Track.findByIdAndDelete(trackId);
  if (!track) {
    throw new AppError('No track found with that ID', 404);
  }

  // Convert all track sessions to standalone sessions
  await Session.updateMany(
    { _id: { $in: track.sessions } },
    {
      $set: {
        isStandalone: true,
        track: null,
      },
    },
  );

  return null;
};

// ===================================================================
// 🔗 SESSION-TRACK RELATIONSHIP MANAGEMENT
// ===================================================================

/**
 * Add a session to a track with validation
 * @param {string} trackId - MongoDB track ID
 * @param {string} sessionId - MongoDB session ID
 * @returns {Promise<Track>} Updated track with new session
 * @throws {AppError} 404 if track/session not found, 400 if invalid operation
 */
exports.addSessionToTrack = async (trackId, sessionId) => {
  const trackExists = await Track.findById(trackId);
  if (!trackExists) {
    throw new AppError('No track found with that ID', 404);
  }

  const session = await Session.findById(sessionId);
  if (!session) {
    throw new AppError('No session found with that ID', 404);
  }

  // Validate session can be added to track
  if (session.track && session.track.toString() === trackId) {
    throw new AppError('Session already belongs to this track', 400);
  }

  if (session.track && session.track.toString() !== trackId) {
    throw new AppError('Session already belongs to another track', 400);
  }

  // Update both session and track in parallel
  session.track = trackId;
  session.isStandalone = false;

  const track = await Track.findByIdAndUpdate(
    trackId,
    { $addToSet: { sessions: sessionId } },
    { new: true, runValidators: true },
  );

  await Promise.all([session.save()]);
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
  const trackExists = await Track.findById(trackId);
  if (!trackExists) {
    throw new AppError('No track found with that ID', 404);
  }

  const session = await Session.findById(sessionId);
  if (!session) {
    throw new AppError('No session found with that ID', 404);
  }

  if (!session.track || session.track.toString() !== trackId) {
    throw new AppError('Session does not belong to this track', 400);
  }

  // Convert session to standalone and remove from track
  session.track = null;
  session.isStandalone = true;

  const track = await Track.findByIdAndUpdate(
    trackId,
    { $pull: { sessions: sessionId } },
    { new: true, runValidators: true },
  );

  await Promise.all([session.save()]);
  return track;
};

// ===================================================================
// 👥 STUDENT ENROLLMENT MANAGEMENT
// ===================================================================

/**
 * Enroll a student in a track with duplicate prevention
 * @param {string} trackId - MongoDB track ID
 * @param {string} studentId - MongoDB user ID (student)
 * @returns {Promise<Track>} Updated track with enrolled student
 * @throws {AppError} 404 if track not found, 400 if already enrolled
 */
exports.enrollStudentInTrack = async (trackId, studentId) => {
  const track = await Track.findById(trackId);
  if (!track) {
    throw new AppError('No track found with that ID', 404);
  }

  // Prevent duplicate enrollment
  if (track.students.includes(studentId)) {
    throw new AppError('Student is already enrolled in this track', 400);
  }

  const updatedTrack = await Track.findByIdAndUpdate(
    trackId,
    { $addToSet: { students: studentId } },
    { new: true, runValidators: true },
  );

  return updatedTrack;
};

/**
 * Remove a student from a track enrollment
 * @param {string} trackId - MongoDB track ID
 * @param {string} studentId - MongoDB user ID (student)
 * @returns {Promise<Track>} Updated track without the student
 * @throws {AppError} 404 if track not found, 400 if student not enrolled
 */
exports.removeStudentFromTrack = async (trackId, studentId) => {
  const track = await Track.findById(trackId);
  if (!track) {
    throw new AppError('No track found with that ID', 404);
  }

  // Ensure student is actually enrolled
  if (!track.students.includes(studentId)) {
    throw new AppError('Student is not enrolled in this track', 400);
  }

  const updatedTrack = await Track.findByIdAndUpdate(
    trackId,
    { $pull: { students: studentId } },
    { new: true, runValidators: true },
  );

  return updatedTrack;
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
  const features = new APIFeatures(
    Track.find({ instructor: instructorId }),
    query,
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const tracks = await features.query;
  const total = await Track.countDocuments({ instructor: instructorId });

  return { tracks, total };
};

/**
 * Get all tracks a student is enrolled in
 * @param {string} studentId - MongoDB user ID (student)
 * @param {Object} query - Filtering and pagination options
 * @returns {Promise<{tracks: Array, total: Number}>} Student's enrolled tracks
 */
exports.getTracksByStudent = async (studentId, query) => {
  const features = new APIFeatures(Track.find({ students: studentId }), query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const tracks = await features.query;
  const total = await Track.countDocuments({ students: studentId });

  return { tracks, total };
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
