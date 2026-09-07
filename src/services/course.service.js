const User = require('../models/user.model');
const Track = require('../models/track.model');
const Course = require('../models/course.model');
const Session = require('../models/session.model');
const Assignment = require('../models/assignment.model');
const Review = require('../models/review.model');
const WeeklyTask = require('../models/weeklytask.model');
const APIFeatures = require('../utils/APIFeatures');
const AppError = require('../utils/AppError');
const cascade = require('./cascade.service');

// ===================================================================
// 🎯 COURSE CRUD OPERATIONS
// ===================================================================

/**
 * Create a new course
 * @param {Object} courseBody - Course data
 * @returns {Promise<Course>} Newly created course
 * @throws {AppError} 400 if validation fails, 409 if title exists
 */
exports.createCourse = async (courseBody) => {
  const course = await Course.create(courseBody);
  return course;
};

/**
 * Get all courses with advanced filtering, sorting, and pagination
 * @param {Object} query - Express query object
 * @returns {Promise<{courses: Array, total: Number}>} Paginated courses
 */
exports.getAllCourses = async (query) => {
  const features = new APIFeatures(Course.find(), query, Course)
    .filter()
    .search(['title', 'description'])
    .sort()
    .limitFields();

  await features.paginate();

  const courses = await features.query;

  return {
    courses: courses || [],
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};

/**
 * Get a single course by ID
 * @param {string} courseId - MongoDB course ID
 * @param {boolean} populateSessions - Whether to populate sessions
 * @returns {Promise<Course>} Course document
 * @throws {AppError} 404 if course not found
 */
exports.getCourseById = async (courseId, populateSessions = false) => {
  let query = Course.findById(courseId);

  if (populateSessions) {
    query = query.populate({
      path: 'sessions',
      select: 'title description duration level published startDate',
      match: { published: true },
    });
  }

  const course = await query;
  if (!course) {
    throw new AppError('No course found with that ID', 404);
  }
  return course;
};

/**
 * Get detailed course with full population
 * @param {string} courseId - MongoDB course ID
 * @returns {Promise<Course>} Fully populated course
 * @throws {AppError} 404 if course not found
 */
exports.getCourseDetails = async (courseId, requestingUser = null) => {
  const course = await Course.findById(courseId)
    .populate({
      path: 'sessions',
      select: 'title description duration level published startDate',
      match: { published: true },
    })
    .populate({ path: 'prerequisites', select: 'title description level' });

  if (!course) throw new AppError('No course found with that ID', 404);

  const isOwner = requestingUser?.id === course.instructor?._id?.toString();
  const isAdmin = requestingUser?.role === 'admin';
  const isEnrolled =
    requestingUser &&
    course.students?.some(
      (studentId) => studentId.toString() === requestingUser.id,
    );

  if (!course.published && !isOwner && !isAdmin) {
    throw new AppError('No course found with that ID', 404);
  }
  if (isOwner || isAdmin || isEnrolled) {
    await course.populate({ path: 'students', select: 'name email photo' });
  }

  return course;
};

/**
 * Update course information
 * @param {string} courseId - MongoDB course ID
 * @param {Object} updateBody - Fields to update
 * @returns {Promise<Course>} Updated course document
 * @throws {AppError} 404 if course not found
 */
exports.updateCourse = async (courseId, updateBody) => {
  const course = await Course.findByIdAndUpdate(courseId, updateBody, {
    new: true,
    runValidators: true,
  });

  if (!course) {
    throw new AppError('No course found with that ID', 404);
  }

  await course.populate([
    { path: 'instructor', select: 'name email role photo' },
    { path: 'track', select: 'title description' },
  ]);

  return course;
};

/**
 * Permanently delete a course and handle related sessions
 * @param {string} courseId - MongoDB course ID
 * @throws {AppError} 404 if course not found
 */
exports.deleteCourse = async (courseId) => {
  const course = await Course.findByIdAndDelete(courseId);
  if (!course) throw new AppError('No course found with that ID', 404);

  await Promise.all([
    Assignment.deleteMany({ course: courseId }),
    Review.deleteMany({ course: courseId }),
    WeeklyTask.deleteMany({ course: courseId }), // also deletes embedded completions
  ]);

  // Remove from parent track
  await Track.updateMany(
    { courses: courseId },
    { $pull: { courses: courseId } },
  );

  // Orphan sessions — they become standalone or keep their track

  const sessionsInCourse = await Session.find({
    _id: { $in: course.sessions },
  });
  for (const session of sessionsInCourse) {
    session.course = null;
    session.isStandalone = !session.tracks?.length && !session.course; // true only if no track
    await session.save();
  }

  if (course.students?.length) {
    await User.updateMany(
      { _id: { $in: course.students } },
      { $pull: { enrolledCourses: courseId } },
    );
  }

  return null;
};

// ===================================================================
// 🔗 SESSION-COURSE RELATIONSHIP MANAGEMENT
// ===================================================================

/**
 * Add a session to a course
 * @param {string} courseId - MongoDB course ID
 * @param {string} sessionId - MongoDB session ID
 * @returns {Promise<Course>} Updated course
 * @throws {AppError} 404/400 if invalid
 */
exports.addSessionToCourse = async (courseId, sessionId) => {
  const courseExists = await Course.findById(courseId);
  if (!courseExists) {
    throw new AppError('No course found with that ID', 404);
  }

  const session = await Session.findById(sessionId);
  if (!session) {
    throw new AppError('No session found with that ID', 404);
  }

  if (courseExists.sessions.some((id) => id.toString() === sessionId)) {
    throw new AppError('Session already exists in this course', 400);
  }

  if (session.course && session.course.toString() !== courseId) {
    await Course.findByIdAndUpdate(session.course, {
      $pull: { sessions: sessionId },
    });
  }

  const course = await Course.findByIdAndUpdate(
    courseId,
    { $addToSet: { sessions: sessionId } },
    { new: true, runValidators: true },
  );

  await Session.findByIdAndUpdate(sessionId, {
    course: courseId,
    isStandalone: false,
  });

  return course;
};

/**
 * Remove a session from a course
 * @param {string} courseId - MongoDB course ID
 * @param {string} sessionId - MongoDB session ID
 * @returns {Promise<Course>} Updated course
 * @throws {AppError} 404/400 if invalid
 */
exports.removeSessionFromCourse = async (courseId, sessionId) => {
  const courseExists = await Course.findById(courseId);
  if (!courseExists) {
    throw new AppError('No course found with that ID', 404);
  }

  const session = await Session.findById(sessionId);
  if (!session) {
    throw new AppError('No session found with that ID', 404);
  }

  if (!courseExists.sessions.some((id) => id.toString() === sessionId)) {
    throw new AppError('Session is not in this course', 400);
  }

  const course = await Course.findByIdAndUpdate(
    courseId,
    { $pull: { sessions: sessionId } },
    { new: true, runValidators: true },
  );

  if (session) {
    session.course = null;
    session.isStandalone = !session.tracks?.length && !session.course; // true if also not in any track
    await session.save();
  }

  return course;
};

// ===================================================================
// 👥 STUDENT ENROLLMENT MANAGEMENT
// ===================================================================

/**
 * Enroll a student in a course
 * @param {string} courseId - MongoDB course ID
 * @param {string} studentId - MongoDB user ID
 * @returns {Promise<Course>} Updated course
 * @throws {AppError} 404/400 if invalid
 */
exports.enrollStudentInCourse = async (courseId, studentId) => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new AppError('No course found with that ID', 404);
  }

  if (course.students.some((id) => id.toString() === studentId)) {
    throw new AppError('Student is already enrolled in this course', 400);
  }

  const updatedCourse = await Course.findByIdAndUpdate(
    courseId,
    { $addToSet: { students: studentId } },
    { new: true, runValidators: true },
  );

  await cascade.syncCourseEnrollment(studentId, courseId);

  return updatedCourse;
};

/**
 * Remove a student from a course
 * @param {string} courseId - MongoDB course ID
 * @param {string} studentId - MongoDB user ID
 * @returns {Promise<Course>} Updated course
 * @throws {AppError} 404/400 if invalid
 */
exports.removeStudentFromCourse = async (courseId, studentId) => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new AppError('No course found with that ID', 404);
  }

  if (!course.students.some((id) => id.toString() === studentId)) {
    throw new AppError('Student is not enrolled in this course', 400);
  }

  const updatedCourse = await Course.findByIdAndUpdate(
    courseId,
    { $pull: { students: studentId } },
    { new: true, runValidators: true },
  );

  await cascade.unsyncCourseEnrollment(studentId, courseId);

  return updatedCourse;
};

// ===================================================================
// 🔍 ADVANCED QUERIES
// ===================================================================

/**
 * Get all courses by instructor
 * @param {string} instructorId - MongoDB user ID
 * @param {Object} query - Filtering options
 * @returns {Promise<{courses: Array, total: Number}>}
 */
exports.getCoursesByInstructor = async (instructorId, query) => {
  const features = new APIFeatures(Course.find(), query, Course)
    .filter({ instructor: instructorId })
    .search(['title', 'description'])
    .sort()
    .limitFields();

  await features.paginate();

  const courses = await features.query;

  return {
    courses,
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};

/**
 * Get all courses by track
 * @param {string} trackId - MongoDB track ID
 * @param {Object} query - Filtering options
 * @returns {Promise<{courses: Array, total: Number}>}
 */
exports.getCoursesByTrack = async (trackId, query) => {
  const features = new APIFeatures(Course.find(), query, Course)
    .filter({ track: trackId })
    .search(['title', 'description'])
    .sort()
    .limitFields();

  await features.paginate();

  const courses = await features.query;

  return {
    courses,
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};

/**
 * Get all courses a student is enrolled in
 * @param {string} studentId - MongoDB user ID
 * @param {Object} query - Filtering options
 * @returns {Promise<{courses: Array, total: Number}>}
 */
exports.getCoursesByStudent = async (studentId, query) => {
  const features = new APIFeatures(Course.find(), query, Course)
    .filter({ students: studentId })
    .sort()
    .limitFields();

  await features.paginate();

  const courses = await features.query;

  return {
    courses,
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};
