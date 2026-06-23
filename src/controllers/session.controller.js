const sessionService = require('../services/session.service');
const enrollmentService = require('../services/enrollment.service');
const catchAsync = require('../utils/catchAsync');

// Create a new session
exports.createSession = catchAsync(async (req, res, next) => {
  // Prevent client spoofing and auto-assign from auth token
  delete req.body.instructor;
  delete req.body.students;
  delete req.body.course;
  delete req.body.tracks;

  req.body.instructor = req.user.id;

  const session = await sessionService.createSession(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      session,
    },
  });
});

// Get all sessions
exports.getAllSessions = catchAsync(async (req, res, next) => {
  const { sessions, total, pagination } = await sessionService.getAllSessions(
    req.query,
  );

  res.status(200).json({
    status: 'success',
    results: sessions.length,
    total,
    pagination,
    data: {
      sessions,
    },
  });
});

// Get single session
exports.getSession = catchAsync(async (req, res, next) => {
  const session = await sessionService.getSessionById(
    req.params.id,
    req.user?.id,
  );

  res.status(200).json({
    status: 'success',
    data: {
      session,
    },
  });
});

// Update session
exports.updateSession = catchAsync(async (req, res, next) => {
  // Prevent changing instructor via update (security)
  delete req.body.instructor;
  delete req.body.students;
  delete req.body.course;
  delete req.body.tracks;
  delete req.body.isStandalone;

  const session = await sessionService.updateSession(req.params.id, req.body);

  res.status(200).json({
    status: 'success',
    data: {
      session,
    },
  });
});

// Delete session
exports.deleteSession = catchAsync(async (req, res, next) => {
  await sessionService.deleteSession(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Add student to session
exports.addStudent = catchAsync(async (req, res, next) => {
  const session = await sessionService.addStudentToSession(
    req.params.id,
    req.body.studentId,
  );

  res.status(200).json({
    status: 'success',
    data: {
      session,
    },
  });
});

// Remove student from session
exports.removeStudent = catchAsync(async (req, res, next) => {
  const session = await sessionService.removeStudentFromSession(
    req.params.id,
    req.params.studentId,
  );

  res.status(200).json({
    status: 'success',
    data: {
      session,
    },
  });
});

// Get sessions by instructor
exports.getSessionsByInstructor = catchAsync(async (req, res, next) => {
  const { sessions, total, pagination } =
    await sessionService.getSessionsByInstructor(
      req.params.instructorId,
      req.query,
    );

  res.status(200).json({
    status: 'success',
    results: sessions.length,
    total,
    pagination,
    data: {
      sessions,
    },
  });
});

// Get sessions by track
exports.getSessionsByTrack = catchAsync(async (req, res, next) => {
  const { sessions, total, pagination } =
    await sessionService.getSessionsByTrack(req.params.trackId, req.query);

  res.status(200).json({
    status: 'success',
    results: sessions.length,
    total,
    pagination,
    data: {
      sessions,
    },
  });
});

exports.enrollMe = catchAsync(async (req, res, next) => {
  const session = await enrollmentService.enrollInSession(
    req.user.id,
    req.params.id,
  );
  res.status(200).json({
    status: 'success',
    message: 'Enrolled successfully',
    data: { session },
  });
});

exports.leaveMe = catchAsync(async (req, res, next) => {
  const session = await enrollmentService.leaveSession(
    req.user.id,
    req.params.id,
  );
  res.status(200).json({
    status: 'success',
    message: 'Left session successfully',
    data: { session },
  });
});
