/**
 * @swagger
 * tags:
 *   - name: Activity Logs
 *     description: Audit trail of user actions across the platform (admin) and a personal activity timeline (self)
 *
 * /activity-logs/me:
 *   get:
 *     operationId: getMyActivityLogs
 *     summary: Get my own activity timeline
 *     description: Returns the authenticated user's own activity history, newest first
 *     tags: [Activity Logs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Activity logs retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActivityLogsResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /activity-logs/summary:
 *   get:
 *     operationId: getActivitySummary
 *     summary: Get aggregated activity stats (admin only)
 *     description: Total activity count, a breakdown by action, and the most active users, optionally scoped to a date range
 *     tags: [Activity Logs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: from
 *         in: query
 *         description: ISO 8601 date, inclusive lower bound
 *         schema: { type: string, format: date-time }
 *       - name: to
 *         in: query
 *         description: ISO 8601 date, inclusive upper bound
 *         schema: { type: string, format: date-time }
 *       - name: action
 *         in: query
 *         description: Restrict the breakdown to a single action
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Summary retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActivitySummaryResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /activity-logs/user/{userId}:
 *   get:
 *     operationId: getUserActivityLogs
 *     summary: Get a specific user's activity timeline (admin only)
 *     tags: [Activity Logs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Activity logs retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActivityLogsResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /activity-logs:
 *   get:
 *     operationId: getAllActivityLogs
 *     summary: List all activity logs (admin only)
 *     description: Supports the standard list query params (page, limit, sort, fields) plus field filters like ?action=login or ?createdAt[gte]=2025-01-01
 *     tags: [Activity Logs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 20 }
 *       - name: action
 *         in: query
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Activity logs retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActivityLogsResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 *   delete:
 *     operationId: pruneActivityLogs
 *     summary: Bulk-delete activity logs older than N days (admin only)
 *     description: Retention/cleanup endpoint. Requires olderThanDays (minimum 30) to prevent accidentally wiping the whole audit trail.
 *     tags: [Activity Logs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: olderThanDays
 *         in: query
 *         required: true
 *         schema: { type: integer, minimum: 30, maximum: 3650 }
 *     responses:
 *       200:
 *         description: Old logs deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: "Deleted 42 activity log(s) older than 2025-07-01T00:00:00.000Z" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedCount: { type: integer, example: 42 }
 *                     cutoff: { type: string, format: date-time }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /activity-logs/{id}:
 *   get:
 *     operationId: getActivityLog
 *     summary: Get a single activity log entry by ID (admin only)
 *     tags: [Activity Logs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Activity log found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     activityLog:
 *                       $ref: '#/components/schemas/ActivityLog'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     operationId: deleteActivityLog
 *     summary: Delete a single activity log entry (admin only)
 *     description: Rare in practice — audit trails are normally append-only. Kept for cases like a targeted erasure request.
 *     tags: [Activity Logs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

const express = require('express');
const activityLogController = require('../controllers/activityLog.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  activityLogIdSchema,
  userIdParamSchema,
  activitySummaryQuerySchema,
  pruneActivityLogsSchema,
} = require('../validations/activityLog.validation');

const router = express.Router();

// There is no POST route here on purpose — see the comment on
// activityLogService.logActivity for why entries are only ever written
// server-side, never accepted directly from a client.

// Every route below requires authentication.
router.use(protect);

/**
 * @route   GET /activity-logs/me
 * @desc    Get the authenticated user's own activity timeline
 * @access  Private (self)
 */
router.get('/me', activityLogController.getMyActivityLogs);

// ===================================================================
// 👑 ADMIN ONLY ROUTES — everything below requires an admin
// ===================================================================
router.use(restrictTo('admin'));

/**
 * @route   GET /activity-logs/summary
 * @desc    Aggregated activity stats (total, by-action breakdown, most active users)
 * @access  Private/Admin
 */
router.get(
  '/summary',
  validate(activitySummaryQuerySchema, 'query'),
  activityLogController.getActivitySummary,
);

/**
 * @route   GET /activity-logs/user/:userId
 * @desc    A specific user's activity timeline
 * @access  Private/Admin
 */
router.get(
  '/user/:userId',
  validate(userIdParamSchema, 'params'),
  activityLogController.getUserActivityLogs,
);

/**
 * @route   GET /activity-logs
 * @desc    List all activity logs (filterable, paginated)
 * @access  Private/Admin
 */
router.get('/', activityLogController.getAllActivityLogs);

/**
 * @route   DELETE /activity-logs?olderThanDays=90
 * @desc    Bulk-delete activity logs older than N days
 * @access  Private/Admin
 */
router.delete(
  '/',
  validate(pruneActivityLogsSchema, 'query'),
  activityLogController.pruneActivityLogs,
);

/**
 * @route   GET /activity-logs/:id
 * @desc    Get a single activity log entry
 * @access  Private/Admin
 */
router.get(
  '/:id',
  validate(activityLogIdSchema, 'params'),
  activityLogController.getActivityLog,
);

/**
 * @route   DELETE /activity-logs/:id
 * @desc    Delete a single activity log entry
 * @access  Private/Admin
 */
router.delete(
  '/:id',
  validate(activityLogIdSchema, 'params'),
  activityLogController.deleteActivityLog,
);

module.exports = router;
