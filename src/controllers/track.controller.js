const enrollmentService = require('../services/enrollment.service');
const trackService = require('../services/track.service');
const catchAsync = require('../utils/catchAsync');

exports.createTrack = catchAsync(async (req, res, next) => {
  // Prevent body spoofing: delete any user-provided instructor
  delete req.body.instructor;
  delete req.body.students;
  delete req.body.courses;
  delete req.body.sessions;

  // Add instructor from the logged-in user (security)
  req.body.instructor = req.user.id;

  const track = await trackService.createTrack(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      track,
    },
  });
});

exports.getAllTracks = catchAsync(async (req, res, next) => {
  const { tracks, total, pagination } = await trackService.getAllTracks(
    req.query,
  );

  res.status(200).json({
    status: 'success',
    results: tracks.length,
    total,
    pagination,
    data: {
      tracks,
    },
  });
});

exports.getTrack = catchAsync(async (req, res, next) => {
  const track = await trackService.getTrackDetails(req.params.id, req.user);

  res.status(200).json({
    status: 'success',
    data: {
      track,
    },
  });
});

exports.updateTrack = catchAsync(async (req, res, next) => {
  // Prevent changing instructor via update (security)
  delete req.body.instructor;
  delete req.body.students;
  delete req.body.courses;
  delete req.body.sessions;

  const track = await trackService.updateTrack(req.params.id, req.body);

  res.status(200).json({
    status: 'success',
    data: {
      track,
    },
  });
});

exports.deleteTrack = catchAsync(async (req, res, next) => {
  await trackService.deleteTrack(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// --- Course Management ---

exports.addCourseToTrack = catchAsync(async (req, res, next) => {
  const track = await trackService.addCourseToTrack(
    req.params.trackId,
    req.params.courseId,
  );
  res.status(200).json({ status: 'success', data: { track } });
});

exports.removeCourseFromTrack = catchAsync(async (req, res, next) => {
  const track = await trackService.removeCourseFromTrack(
    req.params.trackId,
    req.params.courseId,
  );
  res.status(200).json({ status: 'success', data: { track } });
});

// --- Session Management ---

exports.addSessionToTrack = catchAsync(async (req, res, next) => {
  const { trackId, sessionId } = req.params;
  const track = await trackService.addSessionToTrack(trackId, sessionId);

  res.status(200).json({
    status: 'success',
    message: 'Session added to track successfully.',
    data: {
      track,
    },
  });
});

exports.removeSessionFromTrack = catchAsync(async (req, res, next) => {
  const { trackId, sessionId } = req.params;
  const track = await trackService.removeSessionFromTrack(trackId, sessionId);

  res.status(200).json({
    status: 'success',
    message: 'Session removed from track successfully.',
    data: {
      track,
    },
  });
});

exports.addStudent = catchAsync(async (req, res, next) => {
  const track = await enrollmentService.enrollStudentInTrack(
    req.params.id,
    req.body.studentId,
  );
  res.status(200).json({ status: 'success', data: { track } });
});

exports.removeStudent = catchAsync(async (req, res, next) => {
  const track = await enrollmentService.removeStudentFromTrack(
    req.params.id,
    req.params.studentId,
  );
  res.status(200).json({ status: 'success', data: { track } });
});

exports.enrollMe = catchAsync(async (req, res, next) => {
  const track = await enrollmentService.enrollMeInTrack(req.params.id, req.user.id);
  res.status(200).json({
    status: 'success',
    message: 'Application submitted. Waiting for instructor approval.',
    data: { track },
  });
});

exports.getPendingStudents = catchAsync(async (req, res, next) => {
  const pending = await enrollmentService.getPendingStudents(req.params.id);
  res.status(200).json({
    status: 'success',
    results: pending.length,
    data: { pendingStudents: pending },
  });
});

exports.approveStudent = catchAsync(async (req, res, next) => {
  const track = await enrollmentService.approveStudentInTrack(
    req.params.id,
    req.params.studentId,
  );
  res.status(200).json({
    status: 'success',
    message: 'Student approved successfully',
    data: { track },
  });
});

exports.rejectStudent = catchAsync(async (req, res, next) => {
  const track = await enrollmentService.rejectStudentInTrack(
    req.params.id,
    req.params.studentId,
  );
  res.status(200).json({
    status: 'success',
    message: 'Application rejected',
    data: { track },
  });
});

exports.requestLeaveTrack = catchAsync(async (req, res, next) => {
  const track = await enrollmentService.requestLeaveTrack(
    req.params.id,
    req.user.id,
  );
  res.status(200).json({
    status: 'success',
    message: 'Leave request submitted. Waiting for instructor approval.',
    data: { track },
  });
});

exports.approveLeaveTrack = catchAsync(async (req, res, next) => {
  const track = await enrollmentService.approveLeaveTrack(
    req.params.id,
    req.params.studentId,
  );
  res.status(200).json({
    status: 'success',
    message: 'Leave request approved. Student removed from track.',
    data: { track },
  });
});

exports.rejectLeaveTrack = catchAsync(async (req, res, next) => {
  const track = await enrollmentService.rejectLeaveTrack(
    req.params.id,
    req.params.studentId,
  );
  res.status(200).json({
    status: 'success',
    message: 'Leave request rejected',
    data: { track },
  });
});

exports.getPendingLeaves = catchAsync(async (req, res, next) => {
  const pending = await enrollmentService.getPendingLeaves(req.params.id);
  res.status(200).json({
    status: 'success',
    results: pending.length,
    data: { pendingLeaves: pending },
  });
});

exports.getTracksByInstructor = catchAsync(async (req, res, next) => {
  const { tracks, total, pagination } =
    await trackService.getTracksByInstructor(
      req.params.instructorId,
      req.query,
    );

  res.status(200).json({
    status: 'success',
    results: tracks.length,
    total,
    pagination,
    data: {
      tracks,
    },
  });
});

exports.getTracksByStudent = catchAsync(async (req, res, next) => {
  const { tracks, total, pagination } = await trackService.getTracksByStudent(
    req.params.studentId,
    req.query,
  );

  res.status(200).json({
    status: 'success',
    results: tracks.length,
    total,
    pagination,
    data: {
      tracks,
    },
  });
});

exports.getPopularTracks = catchAsync(async (req, res, next) => {
  const tracks = await trackService.getPopularTracks(
    parseInt(req.query.limit, 10) || 10,
  );

  res.status(200).json({
    status: 'success',
    results: tracks.length,
    data: {
      tracks,
    },
  });
});

exports.getTrackAnalytics = catchAsync(async (req, res, next) => {
  const analytics = await trackService.getTrackAnalytics(req.params.id);

  res.status(200).json({
    status: 'success',
    data: {
      analytics,
    },
  });
});
