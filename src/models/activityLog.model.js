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
 *           description: ObjectId reference to the user who did the action
 *           example: 67123abc12ef4567890a1234
 *         action:
 *           type: string
 *           description: Type of action performed
 *           example: "enrolled_in_course"
 *         targetModel:
 *           type: string
 *           description: The model affected (e.g., Course, Track)
 *           example: "Course"
 *         targetId:
 *           type: string
 *           description: The ID of the affected model instance
 *           example: 67123abc12ef4567890a5678
 *         metadata:
 *           type: object
 *           description: Additional context data (e.g., IP, browser, etc.)
 *           example: { ip: "192.168.1.1", browser: "Chrome", duration: "2h" }
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2025-10-18T14:30:00.000Z
 */

const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'login',
        'logout',
        'enrolled_in_course',
        'completed_assignment',
        'created_track',
        'created_course',
        'created_event',
        'created_announcement',
        'deleted_item',
        'updated_profile',
      ],
    },
    targetModel: String,
    targetId: mongoose.Schema.ObjectId,
    metadata: {
      ip: String,
      browser: String,
      device: String,
      os: String,
      duration: String,
      referrer: String,
    },
  },
  { timestamps: true },
);

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
module.exports = ActivityLog;
