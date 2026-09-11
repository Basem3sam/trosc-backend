const catchAsync = require('../utils/catchAsync');
const dashboardStatsService = require('../services/dashboardStats.service');

// GET /dashboard-stats/live — computed on the fly, never persisted
exports.getLiveStats = catchAsync(async (req, res, next) => {
  const stats = await dashboardStatsService.getLiveStats();

  res.status(200).json({
    status: 'success',
    data: stats,
  });
});

exports.getAllSnapshots = catchAsync(async (req, res, next) => {
  const { dashboardStats, total, pagination } =
    await dashboardStatsService.getAllSnapshots(req.query);

  res.status(200).json({
    status: 'success',
    results: dashboardStats.length,
    total,
    pagination,
    data: { dashboardStats },
  });
});

exports.getSnapshot = catchAsync(async (req, res, next) => {
  const dashboardStat = await dashboardStatsService.getSnapshotById(
    req.params.id,
  );

  res.status(200).json({
    status: 'success',
    data: { dashboardStat },
  });
});

// GET /dashboard-stats/latest?period=daily
exports.getLatestSnapshot = catchAsync(async (req, res, next) => {
  const dashboardStat = await dashboardStatsService.getLatestSnapshot(
    req.query.period,
  );

  res.status(200).json({
    status: 'success',
    data: { dashboardStat },
  });
});

// GET /dashboard-stats/trends?period=daily&limit=30
exports.getTrends = catchAsync(async (req, res, next) => {
  // The Joi default() on `limit` never makes it back onto req.query (the
  // validate middleware only checks for errors — see
  // middlewares/validate.middleware.js), so the actual default lives here.
  const limit = req.query.limit ? Number(req.query.limit) : 30;
  const trends = await dashboardStatsService.getTrends(
    req.query.period,
    limit,
  );

  res.status(200).json({
    status: 'success',
    data: { period: req.query.period, trends },
  });
});

// POST /dashboard-stats/snapshot — generate/refresh a snapshot on demand
exports.generateSnapshot = catchAsync(async (req, res, next) => {
  const dashboardStat = await dashboardStatsService.generateSnapshot(
    req.body.period,
    req.body.date,
  );

  res.status(200).json({
    status: 'success',
    message: `${req.body.period} snapshot generated for ${dashboardStat.date.toISOString()}`,
    data: { dashboardStat },
  });
});

exports.deleteSnapshot = catchAsync(async (req, res, next) => {
  await dashboardStatsService.deleteSnapshot(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// DELETE /dashboard-stats?olderThanDays=365
exports.pruneSnapshots = catchAsync(async (req, res, next) => {
  const { deletedCount, cutoff } = await dashboardStatsService.pruneSnapshots(
    req.query.olderThanDays,
  );

  res.status(200).json({
    status: 'success',
    message: `Deleted ${deletedCount} snapshot(s) older than ${cutoff.toISOString()}`,
    data: { deletedCount, cutoff },
  });
});
