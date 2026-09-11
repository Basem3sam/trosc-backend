/**
 * @swagger
 * components:
 *   schemas:
 *     ActivityLog:
 *       type: object
 *       required:
 *         - user
 *         - action
 *       properties:
 *         _id:
 *           type: string
 *           example: 6713b5ac12ef4567890a7777
 *         user:
 *           type: string
 *           description: ObjectId reference to the user who performed the action
 *           example: 67123abc12ef4567890a1234
 *         action:
 *           type: string
 *           description: Type of action performed (see ACTIVITY_ACTIONS)
 *           example: "enrolled_in_course"
 *         targetModel:
 *           type: string
 *           description: The model affected (e.g., Course, Track), if any
 *           example: "Course"
 *         targetId:
 *           type: string
 *           description: The ID of the affected document, if any
 *           example: 67123abc12ef4567890a5678
 *         metadata:
 *           type: object
 *           description: Free-form additional context (IP, user agent, old/new values, etc.)
 *           example: { ip: "192.168.1.1", userAgent: "Mozilla/5.0" }
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2025-10-18T14:30:00.000Z
 *
 *     ActivityLogsResponse:
 *       type: object
 *       properties:
 *         status: { type: string, example: success }
 *         results: { type: integer, example: 20 }
 *         total: { type: integer, example: 143 }
 *         pagination: { type: object }
 *         data:
 *           type: object
 *           properties:
 *             activityLogs:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ActivityLog'
 *
 *     ActivitySummaryResponse:
 *       type: object
 *       properties:
 *         status: { type: string, example: success }
 *         data:
 *           type: object
 *           properties:
 *             totalActivities: { type: integer, example: 512 }
 *             byAction:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   action: { type: string, example: "enrolled_in_course" }
 *                   count: { type: integer, example: 87 }
 *             mostActiveUsers:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   userId: { type: string }
 *                   name: { type: string }
 *                   count: { type: integer }
 */

const mongoose = require('mongoose');
const { ACTIVITY_ACTIONS } = require('../utils/activityActions');

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'ActivityLog must belong to a user'],
    },
    action: {
      type: String,
      required: [true, 'ActivityLog must have an action'],
      enum: {
        values: ACTIVITY_ACTIONS,
        message: 'Unknown activity action: {VALUE}',
      },
    },
    // Both optional, and either can be set without the other (e.g. 'login'
    // has neither). When both are set they describe "this action happened
    // to this specific document".
    targetModel: {
      type: String,
      trim: true,
    },
    targetId: {
      type: mongoose.Schema.ObjectId,
    },
    // Deliberately untyped/free-form (Mixed) rather than a fixed set of
    // sub-fields: different actions want to log different context (an IP
    // for 'login', an old/new value pair for 'updated_track', a grade for
    // 'graded_assignment', etc.), and locking this to a rigid sub-schema
    // would mean constantly revisiting the model as new actions are added.
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    // Audit logs are written once and never modified — an updatedAt field
    // would always just equal createdAt and adds nothing.
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Primary access pattern: "this user's activity, newest first" (self
// profile view, admin investigating a specific user).
activityLogSchema.index({ user: 1, createdAt: -1 });

// Admin filtering/investigation: "everyone who did X, newest first",
// and "everything that happened to this specific document".
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ targetModel: 1, targetId: 1 });

// Straight chronological admin listing / date-range reports / pruning.
activityLogSchema.index({ createdAt: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
module.exports = ActivityLog;
