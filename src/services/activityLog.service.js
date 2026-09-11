const ActivityLog = require('../models/activitylog.model');
const APIFeatures = require('../utils/APIFeatures');
const AppError = require('../utils/AppError');
const { logger } = require('../utils/logger');

// ==============================
// 🔸 Write path
// ==============================

/**
 * Record an activity. This is called from *other* services/controllers as
 * a side effect of whatever they're actually doing (signup, enrollment,
 * grading, etc.) — it must never be able to fail the caller's request.
 *
 * There is deliberately no public "create activity log" HTTP endpoint:
 * letting a client write directly to its own audit trail would let it
 * forge history (e.g. logging a fake 'graded_assignment' entry). Every
 * entry is written server-side, by code that already knows the action
 * actually happened.
 *
 * @param {Object} params
 * @param {string} params.userId - who performed the action
 * @param {string} params.action - one of ACTIVITY_ACTIONS (see activityActions.js)
 * @param {string} [params.targetModel] - e.g. 'Course', 'Track'
 * @param {string} [params.targetId] - the affected document's ID
 * @param {Object} [params.metadata] - free-form extra context
 * @returns {Promise<Object|null>} the created log, or null if logging failed
 */
exports.logActivity = async ({
  userId,
  action,
  targetModel,
  targetId,
  metadata,
}) => {
  try {
    return await ActivityLog.create({
      user: userId,
      action,
      targetModel,
      targetId,
      metadata,
    });
  } catch (error) {
    // Swallow the error: a broken audit-log write should never take down
    // the enrollment/signup/grading flow that triggered it. We still want
    // to know about it, so it goes to the logger instead.
    logger.error('Failed to write activity log', {
      action,
      userId,
      error: error.message,
    });
    return null;
  }
};

// ==============================
// 🔸 Read path
// ==============================

/**
 * List all activity logs, newest first. Admin only.
 * Supports the standard APIFeatures query params (page, limit, sort,
 * fields, plus field-based filters like ?action=login or
 * ?createdAt[gte]=2025-01-01), the same way every other list endpoint
 * in this API does.
 * @param {Object} query - req.query
 * @returns {Promise<{activityLogs, total, pagination}>}
 */
exports.getAllActivityLogs = async (query) => {
  const baseQuery = ActivityLog.find().sort({ createdAt: -1 });
  const features = new APIFeatures(baseQuery, query, ActivityLog)
    .filter()
    .limitFields();

  await features.paginate();
  const activityLogs = await features.query.populate(
    'user',
    'name email photo role',
  );

  return {
    activityLogs: activityLogs || [],
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};

/**
 * Get a single activity log entry by ID. Admin only.
 * @param {string} id
 * @returns {Promise<Object>}
 */
exports.getActivityLogById = async (id) => {
  const activityLog = await ActivityLog.findById(id).populate(
    'user',
    'name email photo role',
  );
  if (!activityLog) {
    throw new AppError('No activity log found with that ID', 404);
  }
  return activityLog;
};

/**
 * Get a single user's activity timeline, newest first. Used by both
 * "my activity" (self) and the admin "this user's activity" view — the
 * authorization difference between the two lives in the controller/route,
 * not here.
 * @param {string} userId
 * @param {Object} query - req.query
 * @returns {Promise<{activityLogs, total, pagination}>}
 */
exports.getUserActivityLogs = async (userId, query) => {
  const baseQuery = ActivityLog.find({ user: userId }).sort({
    createdAt: -1,
  });
  const features = new APIFeatures(baseQuery, query, ActivityLog)
    .filter({ user: userId })
    .limitFields();

  await features.paginate();
  const activityLogs = await features.query;

  return {
    activityLogs: activityLogs || [],
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};

/**
 * Aggregated stats: total activity count, a breakdown by action, and the
 * most active users — all within an optional date range. Admin only.
 * @param {Object} params
 * @param {string} [params.from] - ISO date string, inclusive lower bound
 * @param {string} [params.to] - ISO date string, inclusive upper bound
 * @param {string} [params.action] - restrict the breakdown to one action
 * @returns {Promise<{totalActivities, byAction, mostActiveUsers}>}
 */
exports.getActivitySummary = async ({ from, to, action } = {}) => {
  const match = {};
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }
  if (action) match.action = action;

  const [totalActivities, byAction, mostActiveUsers] = await Promise.all([
    ActivityLog.countDocuments(match),

    ActivityLog.aggregate([
      { $match: match },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, action: '$_id', count: 1 } },
    ]),

    ActivityLog.aggregate([
      { $match: match },
      { $group: { _id: '$user', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: '$user.name',
          count: 1,
        },
      },
    ]),
  ]);

  return { totalActivities, byAction, mostActiveUsers };
};

/**
 * Delete a single activity log entry. Admin only. Rare in practice (audit
 * trails are normally append-only) but kept available for cases like a
 * user-erasure/GDPR-style request targeting one specific record.
 * @param {string} id
 */
exports.deleteActivityLog = async (id) => {
  const activityLog = await ActivityLog.findByIdAndDelete(id);
  if (!activityLog) {
    throw new AppError('No activity log found with that ID', 404);
  }
  return null;
};

/**
 * Bulk-delete every activity log older than `olderThanDays`. Admin only —
 * this is the actual retention/cleanup mechanism (e.g. wired up behind a
 * scheduled job), exposed as a route mainly so it can be triggered
 * on-demand without shelling into the server.
 * @param {number} olderThanDays
 * @returns {Promise<{deletedCount: number, cutoff: Date}>}
 */
exports.pruneActivityLogs = async (olderThanDays) => {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const result = await ActivityLog.deleteMany({ createdAt: { $lt: cutoff } });
  return { deletedCount: result.deletedCount || 0, cutoff };
};
