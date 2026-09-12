const DashboardStats = require('../models/dashboardstats.model');
const User = require('../models/user.model');
const Track = require('../models/track.model');
const Course = require('../models/course.model');
const Assignment = require('../models/assignment.model');
const Event = require('../models/event.model');
const Announcement = require('../models/announcement.model');
const APIFeatures = require('../utils/APIFeatures');
const AppError = require('../utils/AppError');
const { logger } = require('../utils/logger');

// ==============================
// 🔸 Period math
// ==============================

/**
 * Normalize an arbitrary date into the [start, end) window for its period
 * — e.g. for 'daily' that's midnight UTC on that day through midnight UTC
 * the next day. `date` (the snapshot's stored identity) is always `start`.
 * @param {'daily'|'weekly'|'monthly'} periodName
 * @param {Date} referenceDate - any date within the target period
 * @returns {{start: Date, end: Date}}
 */
function getPeriodBounds(periodName, referenceDate) {
  const d = new Date(referenceDate);
  if (Number.isNaN(d.getTime())) {
    throw new AppError('Invalid date', 400);
  }

  let start;
  let end;

  if (periodName === 'daily') {
    start = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
    end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
  } else if (periodName === 'weekly') {
    // ISO-style week starting Monday.
    const dayOfWeek = d.getUTCDay(); // Sun=0 .. Sat=6
    const daysSinceMonday = (dayOfWeek + 6) % 7; // Mon=0 .. Sun=6
    start = new Date(
      Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate() - daysSinceMonday,
      ),
    );
    end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
  } else if (periodName === 'monthly') {
    start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  } else {
    throw new AppError(
      `Unknown period: ${periodName}. Must be daily, weekly, or monthly.`,
      400,
    );
  }

  return { start, end };
}

// ==============================
// 🔸 Computation
// ==============================

/**
 * Compute every stat field as of `cutoff`, with `newUsers` scoped to
 * [rangeStart, cutoff). Pure — reads from the live collections, never
 * writes anything. Used both by generateSnapshot() (which persists the
 * result) and getLiveStats() (which doesn't).
 * @param {Date} cutoff - "as of" timestamp; totals count everything created before this
 * @param {Date} rangeStart - lower bound for the newUsers count
 * @returns {Promise<Object>} every DashboardStats field except period/date
 */
async function computeStats(cutoff, rangeStart) {
  const createdBefore = { createdAt: { $lt: cutoff } };

  const [
    totalUsers,
    newUsers,
    totalTracks,
    totalCourses,
    totalAssignments,
    totalEvents,
    totalAnnouncements,
    submissionAgg,
    completionAgg,
    topTrack,
  ] = await Promise.all([
    User.countDocuments(createdBefore),
    User.countDocuments({ createdAt: { $gte: rangeStart, $lt: cutoff } }),
    Track.countDocuments(createdBefore),
    Course.countDocuments(createdBefore),
    Assignment.countDocuments(createdBefore),
    Event.countDocuments(createdBefore),
    Announcement.countDocuments(createdBefore),

    // Total submissions: only count submissions that existed by `cutoff`
    // (a resubmission after the cutoff shouldn't retroactively appear in
    // a past snapshot).
    Assignment.aggregate([
      { $match: createdBefore },
      {
        $project: {
          count: {
            $size: {
              $filter: {
                input: '$submissions',
                as: 's',
                cond: { $lt: ['$$s.submittedAt', cutoff] },
              },
            },
          },
        },
      },
      { $group: { _id: null, total: { $sum: '$count' } } },
    ]),

    // Average completion rate: for each assignment, (submissions as of
    // cutoff) / (current roster size of its course or session), as a
    // percentage, averaged across all assignments that have a roster to
    // divide by. Roster size is always the *current* enrollment (Mongo
    // doesn't retain historical roster snapshots), so this is most
    // accurate for the latest period and only approximate for older ones.
    Assignment.aggregate([
      { $match: createdBefore },
      {
        $project: {
          course: 1,
          session: 1,
          submissionCount: {
            $size: {
              $filter: {
                input: '$submissions',
                as: 's',
                cond: { $lt: ['$$s.submittedAt', cutoff] },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseDoc',
        },
      },
      {
        $lookup: {
          from: 'sessions',
          localField: 'session',
          foreignField: '_id',
          as: 'sessionDoc',
        },
      },
      {
        $addFields: {
          enrolledCount: {
            $cond: [
              { $gt: [{ $size: '$courseDoc' }, 0] },
              {
                $size: {
                  $ifNull: [{ $arrayElemAt: ['$courseDoc.students', 0] }, []],
                },
              },
              {
                $size: {
                  $ifNull: [
                    { $arrayElemAt: ['$sessionDoc.students', 0] },
                    [],
                  ],
                },
              },
            ],
          },
        },
      },
      // Assignments with nobody enrolled can't have a meaningful
      // completion rate — exclude rather than counting them as 0%.
      { $match: { enrolledCount: { $gt: 0 } } },
      {
        $addFields: {
          completionRate: {
            // A student can submit and then unenroll, dropping the
            // current roster below the submission count — cap at 100
            // rather than let a single assignment push the rate over,
            // which would fail the schema's max:100 validator in
            // generateSnapshot and silently kill the whole snapshot.
            $min: [
              {
                $multiply: [
                  { $divide: ['$submissionCount', '$enrolledCount'] },
                  100,
                ],
              },
              100,
            ],
          },
        },
      },
      { $group: { _id: null, avgRate: { $avg: '$completionRate' } } },
    ]),

    // Most active track as of cutoff: the track (that existed by then)
    // with the largest current student roster.
    Track.aggregate([
      { $match: createdBefore },
      { $project: { studentCount: { $size: { $ifNull: ['$students', []] } } } },
      { $sort: { studentCount: -1 } },
      { $limit: 1 },
    ]),
  ]);

  const totalSubmissions = submissionAgg[0]?.total || 0;
  const avgCompletionRate = completionAgg[0]?.avgRate
    ? Math.round(completionAgg[0].avgRate * 100) / 100
    : 0;
  const mostActiveTrack =
    topTrack.length && topTrack[0].studentCount > 0 ? topTrack[0]._id : null;

  return {
    totalUsers,
    newUsers,
    totalTracks,
    totalCourses,
    totalAssignments,
    totalSubmissions,
    avgCompletionRate,
    totalEvents,
    totalAnnouncements,
    mostActiveTrack,
  };
}

// ==============================
// 🔸 Write path
// ==============================

/**
 * Compute and persist (upsert) the snapshot for the period containing
 * `date`. Safe to call repeatedly for the same period/date — it
 * overwrites in place rather than creating duplicates, so it can be
 * re-run to "refresh" today's numbers as the day goes on.
 * @param {'daily'|'weekly'|'monthly'} periodName
 * @param {Date|string} [date] - defaults to now
 * @returns {Promise<Object>} the saved DashboardStats document
 */
exports.generateSnapshot = async (periodName, date = new Date()) => {
  const { start, end } = getPeriodBounds(periodName, date);
  const stats = await computeStats(end, start);

  const snapshot = await DashboardStats.findOneAndUpdate(
    { period: periodName, date: start },
    { $set: stats },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  logger.info('Generated dashboard stats snapshot', {
    period: periodName,
    date: start.toISOString(),
  });

  return snapshot;
};

// ==============================
// 🔸 Read path
// ==============================

/**
 * Compute stats right now, without persisting anything. `newUsers` is
 * scoped to the last 24 hours (there's no "period" for a live view).
 * @returns {Promise<Object>}
 */
exports.getLiveStats = async () => {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const stats = await computeStats(now, oneDayAgo);
  return { ...stats, computedAt: now };
};

/**
 * List all stored snapshots. Admin only. Supports the standard
 * APIFeatures query params, e.g. ?period=daily or
 * ?date[gte]=2025-01-01&date[lte]=2025-02-01.
 * @param {Object} query - req.query
 * @returns {Promise<{dashboardStats, total, pagination}>}
 */
exports.getAllSnapshots = async (query) => {
  const baseQuery = DashboardStats.find().sort({ date: -1 });
  const features = new APIFeatures(baseQuery, query, DashboardStats)
    .filter()
    .limitFields();

  await features.paginate();
  const dashboardStats = await features.query.populate(
    'mostActiveTrack',
    'title',
  );

  return {
    dashboardStats: dashboardStats || [],
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};

/**
 * Get a single snapshot by ID. Admin only.
 * @param {string} id
 * @returns {Promise<Object>}
 */
exports.getSnapshotById = async (id) => {
  const snapshot = await DashboardStats.findById(id).populate(
    'mostActiveTrack',
    'title',
  );
  if (!snapshot) {
    throw new AppError('No dashboard stats snapshot found with that ID', 404);
  }
  return snapshot;
};

/**
 * Get the most recent stored snapshot for a period. Admin only.
 * @param {'daily'|'weekly'|'monthly'} periodName
 * @returns {Promise<Object>}
 */
exports.getLatestSnapshot = async (periodName) => {
  const snapshot = await DashboardStats.findOne({ period: periodName })
    .sort({ date: -1 })
    .populate('mostActiveTrack', 'title');
  if (!snapshot) {
    throw new AppError(
      `No ${periodName} snapshot has been generated yet`,
      404,
    );
  }
  return snapshot;
};

/**
 * Get the last `limit` snapshots for a period, oldest first — ready to
 * feed straight into a trend chart. Admin only.
 * @param {'daily'|'weekly'|'monthly'} periodName
 * @param {number} limit
 * @returns {Promise<Array<Object>>}
 */
exports.getTrends = async (periodName, limit) => {
  const trends = await DashboardStats.find({ period: periodName })
    .sort({ date: -1 })
    .limit(limit);

  return trends.reverse();
};

/**
 * Delete a single snapshot. Admin only.
 * @param {string} id
 */
exports.deleteSnapshot = async (id) => {
  const snapshot = await DashboardStats.findByIdAndDelete(id);
  if (!snapshot) {
    throw new AppError('No dashboard stats snapshot found with that ID', 404);
  }
  return null;
};

/**
 * Bulk-delete every snapshot older than `olderThanDays` (by its `date`
 * field). Admin only — retention/cleanup, mirrors
 * activityLogService.pruneActivityLogs.
 * @param {number} olderThanDays
 * @returns {Promise<{deletedCount: number, cutoff: Date}>}
 */
exports.pruneSnapshots = async (olderThanDays) => {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const result = await DashboardStats.deleteMany({ date: { $lt: cutoff } });
  return { deletedCount: result.deletedCount || 0, cutoff };
};

// Exposed for the CLI script (scripts/generateDashboardSnapshot.js) and
// for tests that need to assert on period-boundary math directly.
exports.getPeriodBounds = getPeriodBounds;
