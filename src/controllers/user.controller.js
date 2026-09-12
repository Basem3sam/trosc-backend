const Track = require('../models/track.model');
const Course = require('../models/course.model');
const Session = require('../models/session.model');
const catchAsync = require('../utils/catchAsync');
const userService = require('../services/user.service');

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const { users, total, pagination } = await userService.getAllUsers(req.query);
  res.status(200).json({
    status: 'success',
    results: users.length,
    total,
    pagination,
    data: { users },
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await userService.getUserById(req.params.id);
  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

exports.createUser = catchAsync(async (req, res, next) => {
  const user = await userService.createUser(req.body);
  res.status(201).json({
    status: 'success',
    data: { user },
  });
});

exports.updateUser = catchAsync(async (req, res, next) => {
  const updatedUser = await userService.updateUser(req.params.id, req.body);
  res.status(200).json({
    status: 'success',
    data: { user: updatedUser },
  });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  await userService.deleteUser(req.params.id);
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getMe = catchAsync(async (req, res, next) => {
  const user = await userService.getMe(req.user.id);

  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  const updatedUser = await userService.updateMe(req.user.id, req.body);
  res.status(200).json({
    status: 'success',
    data: { user: updatedUser },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await userService.deleteMe(req.user.id);
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.bulkUserAction = catchAsync(async (req, res, next) => {
  const { userIds, action } = req.body;

  await userService.bulkUserAction(userIds, action, req.user.id);

  res.status(200).json({
    status: 'success',
    message: `Bulk ${action} completed successfully`,
  });
});

exports.getMyEnrollments = catchAsync(async (req, res, next) => {
  // Query the User document's own enrolledTrack/enrolledCourses/
  // enrolledSessions fields rather than the reverse `students` arrays on
  // Track/Course/Session — those two are supposed to stay in sync (see
  // cascade.service.js), but the User fields are the side every
  // enroll/unenroll flow ultimately writes to, so they're the
  // authoritative source if the two ever drift apart.
  const [track, courses, sessions] = await Promise.all([
    req.user.enrolledTrack
      ? Track.findById(req.user.enrolledTrack).select(
          'title description coverImage level published',
        )
      : null,
    Course.find({ _id: { $in: req.user.enrolledCourses || [] } }).select(
      'title description coverImage level track published',
    ),
    Session.find({ _id: { $in: req.user.enrolledSessions || [] } }).select(
      'title description coverImage level published startDate',
    ),
  ]);

  res.status(200).json({
    status: 'success',
    data: { tracks: track ? [track] : [], courses, sessions },
  });
});
