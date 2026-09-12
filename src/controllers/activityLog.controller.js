const catchAsync = require('../utils/catchAsync');
const activityLogService = require('../services/activityLog.service');

exports.getAllActivityLogs = catchAsync(async (req, res, next) => {
  const { activityLogs, total, pagination } =
    await activityLogService.getAllActivityLogs(req.query);

  res.status(200).json({
    status: 'success',
    results: activityLogs.length,
    total,
    pagination,
    data: { activityLogs },
  });
});

exports.getActivityLog = catchAsync(async (req, res, next) => {
  const activityLog = await activityLogService.getActivityLogById(
    req.params.id,
  );

  res.status(200).json({
    status: 'success',
    data: { activityLog },
  });
});

// GET /activity-logs/me — the authenticated user's own timeline
exports.getMyActivityLogs = catchAsync(async (req, res, next) => {
  const { activityLogs, total, pagination } =
    await activityLogService.getUserActivityLogs(req.user.id, req.query);

  res.status(200).json({
    status: 'success',
    results: activityLogs.length,
    total,
    pagination,
    data: { activityLogs },
  });
});

// GET /activity-logs/user/:userId — admin viewing a specific user's timeline
exports.getUserActivityLogs = catchAsync(async (req, res, next) => {
  const { activityLogs, total, pagination } =
    await activityLogService.getUserActivityLogs(req.params.userId, req.query);

  res.status(200).json({
    status: 'success',
    results: activityLogs.length,
    total,
    pagination,
    data: { activityLogs },
  });
});

exports.getActivitySummary = catchAsync(async (req, res, next) => {
  const summary = await activityLogService.getActivitySummary(req.query);

  res.status(200).json({
    status: 'success',
    data: summary,
  });
});

exports.deleteActivityLog = catchAsync(async (req, res, next) => {
  await activityLogService.deleteActivityLog(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// DELETE /activity-logs?olderThanDays=90 — bulk retention cleanup
exports.pruneActivityLogs = catchAsync(async (req, res, next) => {
  const { deletedCount, cutoff } = await activityLogService.pruneActivityLogs(
    req.query.olderThanDays,
  );

  res.status(200).json({
    status: 'success',
    message: `Deleted ${deletedCount} activity log(s) older than ${cutoff.toISOString()}`,
    data: { deletedCount, cutoff },
  });
});
