const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/, 'MongoDB ObjectId');
const period = Joi.string().valid('daily', 'weekly', 'monthly');

exports.dashboardStatsIdSchema = Joi.object({
  id: objectId.required().messages({
    'string.pattern.base': 'Dashboard stats ID must be a valid MongoDB ID',
  }),
});

// Body schema for POST /dashboard-stats/snapshot
exports.generateSnapshotSchema = Joi.object({
  period: period.required().messages({
    'any.only': 'period must be one of: daily, weekly, monthly',
    'any.required': 'period is required',
  }),
  // Which period-instance to (re)generate. Defaults to "now" if omitted —
  // see the controller. Accepts any date within the target period; it
  // gets normalized to the period's start before use.
  date: Joi.date().iso().messages({
    'date.format': 'date must be an ISO 8601 date',
  }),
});

// Query schema for GET /dashboard-stats/latest
exports.latestQuerySchema = Joi.object({
  period: period.required().messages({
    'any.only': 'period must be one of: daily, weekly, monthly',
    'any.required': 'period is required',
  }),
});

// Query schema for GET /dashboard-stats/trends
exports.trendsQuerySchema = Joi.object({
  period: period.required().messages({
    'any.only': 'period must be one of: daily, weekly, monthly',
    'any.required': 'period is required',
  }),
  limit: Joi.number().integer().min(1).max(365).default(30).messages({
    'number.min': 'limit must be at least 1',
    'number.max': 'limit must be at most 365',
  }),
});

// Query schema for GET /dashboard-stats (list). Every other route in this
// module validates its query/params/body — this one didn't, so an
// unrecognized param (e.g. a typo'd ?perido=daily) silently fell through
// to APIFeatures as a no-op filter instead of a 400. Kept permissive
// enough to still support the documented range-filter shape
// (?date[gte]=...&date[lte]=...) alongside the standard list params.
exports.listSnapshotsQuerySchema = Joi.object({
  period,
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  sort: Joi.string(),
  fields: Joi.string(),
  date: Joi.object({
    gte: Joi.date().iso(),
    gt: Joi.date().iso(),
    lte: Joi.date().iso(),
    lt: Joi.date().iso(),
  }).messages({
    'date.format': 'date filters must be ISO 8601 dates',
  }),
}).messages({
  'any.only': 'period must be one of: daily, weekly, monthly',
});

// Query schema for DELETE /dashboard-stats (bulk prune). Same 30-day
// safety floor as the ActivityLog prune endpoint, for the same reason:
// a typo shouldn't be able to wipe the whole historical trend.
exports.pruneDashboardStatsSchema = Joi.object({
  olderThanDays: Joi.number().integer().min(30).max(3650).required().messages({
    'any.required':
      '"olderThanDays" is required (minimum 30, to prevent accidental full wipes)',
    'number.min': 'olderThanDays must be at least 30',
    'number.max': 'olderThanDays must be at most 3650 (10 years)',
  }),
});
