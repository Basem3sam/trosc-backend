// controllers/course.controller.js

const courseService = require('../services/course.service');
const catchAsync = require('../utils/catchAsync');

exports.createCourse = catchAsync(async (req, res, next) => {
  // Auto-assign instructor from logged-in user, prevent body spoofing
  delete req.body.instructor;
  delete req.body.students;
  req.body.instructor = req.user.id;

  const course = await courseService.createCourse(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      course,
    },
  });
});

exports.getAllCourses = catchAsync(async (req, res, next) => {
  const { courses, total, pagination } = await courseService.getAllCourses(req.query);

  res.status(200).json({
    status: 'success',
    results: courses.length,
    total,
    pagination,
    data: {
      courses,
    },
  });
});

exports.getCourse = catchAsync(async (req, res, next) => {
  const course = await courseService.getCourseDetails(req.params.id);

  res.status(200).json({
    status: 'success',
    data: {
      course,
    },
  });
});

exports.updateCourse = catchAsync(async (req, res, next) => {
  // Prevent changing instructor via update (security)
  delete req.body.instructor;
  delete req.body.students;
  const course = await courseService.updateCourse(req.params.id, req.body);

  res.status(200).json({
    status: 'success',
    data: {
      course,
    },
  });
});

exports.deleteCourse = catchAsync(async (req, res, next) => {
  await courseService.deleteCourse(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// --- Session Management ---

exports.addSessionToCourse = catchAsync(async (req, res, next) => {
  const { courseId, sessionId } = req.params;
  const course = await courseService.addSessionToCourse(courseId, sessionId);

  res.status(200).json({
    status: 'success',
    message: 'Session added to course successfully.',
    data: {
      course,
    },
  });
});

exports.removeSessionFromCourse = catchAsync(async (req, res, next) => {
  const { courseId, sessionId } = req.params;
  const course = await courseService.removeSessionFromCourse(
    courseId,
    sessionId,
  );

  res.status(200).json({
    status: 'success',
    message: 'Session removed from course successfully.',
    data: {
      course,
    },
  });
});

// --- Student Enrollment ---

exports.addStudent = catchAsync(async (req, res, next) => {
  const course = await courseService.enrollStudentInCourse(
    req.params.id,
    req.body.studentId,
  );

  res.status(200).json({
    status: 'success',
    data: {
      course,
    },
  });
});

exports.removeStudent = catchAsync(async (req, res, next) => {
  const course = await courseService.removeStudentFromCourse(
    req.params.id,
    req.params.studentId,
  );

  res.status(200).json({
    status: 'success',
    data: {
      course,
    },
  });
});

// --- Filtering Routes ---

exports.getCoursesByInstructor = catchAsync(async (req, res, next) => {
  const { courses, total, pagination } = await courseService.getCoursesByInstructor(
    req.params.instructorId,
    req.query,
  );

  res.status(200).json({
    status: 'success',
    results: courses.length,
    total,
    pagination,
    data: {
      courses,
    },
  });
});

exports.getCoursesByTrack = catchAsync(async (req, res, next) => {
  const { courses, total, pagination } = await courseService.getCoursesByTrack(
    req.params.trackId,
    req.query,
  );

  res.status(200).json({
    status: 'success',
    results: courses.length,
    total,
    pagination,
    data: {
      courses,
    },
  });
});

exports.getCoursesByStudent = catchAsync(async (req, res, next) => {
  const { courses, total, pagination } = await courseService.getCoursesByStudent(
    req.params.studentId,
    req.query,
  );

  res.status(200).json({
    status: 'success',
    results: courses.length,
    total,
    pagination,
    data: {
      courses,
    },
  });
});
