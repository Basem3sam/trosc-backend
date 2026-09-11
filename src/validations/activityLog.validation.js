const Joi = require('joi');
const { ACTIVITY_ACTIONS } = require('../utils/activityActions');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/, 'MongoDB ObjectId');

exports.activityLogIdSchema = Joi.object({
  id: objectId.required().messages({
    'string.pattern.base': 'Activity log ID must be a valid MongoDB ID',
  }),
});

exports.userIdParamSchema = Joi.object({
  userId: objectId.required().messages({
    'string.pattern.base': 'User ID must be a valid MongoDB ID',
  }),
});

// Query-string schema for GET /activity-logs/summary. Kept deliberately
// small (date range only) — everything else on that endpoint is a fixed
// aggregation, not a user-controlled filter.
exports.activitySummaryQuerySchema = Joi.object({
  from: Joi.date().iso().messages({
    'date.format': '"from" must be an ISO 8601 date',
  }),
  to: Joi.date().iso().min(Joi.ref('from')).messages({
    'date.format': '"to" must be an ISO 8601 date',
    'date.min': '"to" must be on or after "from"',
  }),
  action: Joi.string()
    .valid(...ACTIVITY_ACTIONS)
    .messages({
      'any.only': `"action" must be one of: ${ACTIVITY_ACTIONS.join(', ')}`,
    }),
});

// Query-string schema for DELETE /activity-logs (bulk prune). This is a
// genuinely destructive, unrecoverable bulk delete, so it gets stricter
// validation than the rest of the module: required, integer, and floored
// at 30 days so a typo like `?olderThanDays=0` can't wipe the entire
// audit trail in one call.
exports.pruneActivityLogsSchema = Joi.object({
  olderThanDays: Joi.number().integer().min(30).max(3650).required().messages({
    'any.required':
      '"olderThanDays" is required (minimum 30, to prevent accidental full wipes)',
    'number.min': 'olderThanDays must be at least 30',
    'number.max': 'olderThanDays must be at most 3650 (10 years)',
  }),
});
