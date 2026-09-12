/**
 * @swagger
 * tags:
 *   - name: Dashboard Stats
 *     description: Admin analytics — live platform stats and historical snapshots for trend charts
 *
 * /dashboard-stats/live:
 *   get:
 *     operationId: getLiveStats
 *     summary: Get current platform stats, computed on the fly (admin only)
 *     description: Not persisted. `newUsers` covers the last 24 hours.
 *     tags: [Dashboard Stats]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Live stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/DashboardStats'
 *                     - type: object
 *                       properties:
 *                         computedAt: { type: string, format: date-time }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /dashboard-stats/latest:
 *   get:
 *     operationId: getLatestSnapshot
 *     summary: Get the most recently generated snapshot for a period (admin only)
 *     tags: [Dashboard Stats]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: period
 *         in: query
 *         required: true
 *         schema: { type: string, enum: [daily, weekly, monthly] }
 *     responses:
 *       200:
 *         description: Latest snapshot
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     dashboardStat:
 *                       $ref: '#/components/schemas/DashboardStats'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /dashboard-stats/trends:
 *   get:
 *     operationId: getTrends
 *     summary: Get the last N snapshots for a period, oldest first (admin only)
 *     description: Ready to feed directly into a trend chart.
 *     tags: [Dashboard Stats]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: period
 *         in: query
 *         required: true
 *         schema: { type: string, enum: [daily, weekly, monthly] }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 30, minimum: 1, maximum: 365 }
 *     responses:
 *       200:
 *         description: Trend series
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardTrendsResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /dashboard-stats/snapshot:
 *   post:
 *     operationId: generateSnapshot
 *     summary: Generate (or refresh) a snapshot on demand (admin only)
 *     description: Upserts — re-running for the same period/date overwrites rather than duplicating. Intended for both a manual "refresh now" admin action and for a scheduled job to call.
 *     tags: [Dashboard Stats]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [period]
 *             properties:
 *               period: { type: string, enum: [daily, weekly, monthly] }
 *               date:
 *                 type: string
 *                 format: date-time
 *                 description: Any date within the target period. Defaults to now.
 *     responses:
 *       200:
 *         description: Snapshot generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     dashboardStat:
 *                       $ref: '#/components/schemas/DashboardStats'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /dashboard-stats:
 *   get:
 *     operationId: getAllSnapshots
 *     summary: List stored snapshots (admin only)
 *     description: Supports the standard list query params plus field filters like ?period=daily or ?date[gte]=2025-01-01
 *     tags: [Dashboard Stats]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 20 }
 *       - name: period
 *         in: query
 *         schema: { type: string, enum: [daily, weekly, monthly] }
 *       - name: date[gte]
 *         in: query
 *         schema: { type: string, format: date }
 *         description: Only snapshots on/after this date
 *       - name: date[lte]
 *         in: query
 *         schema: { type: string, format: date }
 *         description: Only snapshots on/before this date
 *     responses:
 *       200:
 *         description: Snapshots retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardStatsResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 *   delete:
 *     operationId: pruneDashboardStats
 *     summary: Bulk-delete snapshots older than N days (admin only)
 *     tags: [Dashboard Stats]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: olderThanDays
 *         in: query
 *         required: true
 *         schema: { type: integer, minimum: 30, maximum: 3650 }
 *     responses:
 *       200:
 *         description: Old snapshots deleted
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /dashboard-stats/{id}:
 *   get:
 *     operationId: getDashboardStat
 *     summary: Get a single snapshot by ID (admin only)
 *     tags: [Dashboard Stats]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Snapshot found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     dashboardStat:
 *                       $ref: '#/components/schemas/DashboardStats'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     operationId: deleteDashboardStat
 *     summary: Delete a single snapshot (admin only)
 *     tags: [Dashboard Stats]
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
const dashboardStatsController = require('../controllers/dashboardStats.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  dashboardStatsIdSchema,
  generateSnapshotSchema,
  latestQuerySchema,
  trendsQuerySchema,
  listSnapshotsQuerySchema,
  pruneDashboardStatsSchema,
} = require('../validations/dashboardStats.validation');

const router = express.Router();

// The whole module is admin-only — this is platform-wide analytics, not
// something any authenticated user should see.
router.use(protect, restrictTo('admin'));

/**
 * @route   GET /dashboard-stats/live
 * @desc    Current stats, computed on the fly (not persisted)
 * @access  Private/Admin
 */
router.get('/live', dashboardStatsController.getLiveStats);

/**
 * @route   GET /dashboard-stats/latest?period=daily
 * @desc    Most recently generated stored snapshot for a period
 * @access  Private/Admin
 */
router.get(
  '/latest',
  validate(latestQuerySchema, 'query'),
  dashboardStatsController.getLatestSnapshot,
);

/**
 * @route   GET /dashboard-stats/trends?period=daily&limit=30
 * @desc    Last N snapshots for a period, oldest first (for charting)
 * @access  Private/Admin
 */
router.get(
  '/trends',
  validate(trendsQuerySchema, 'query'),
  dashboardStatsController.getTrends,
);

/**
 * @route   POST /dashboard-stats/snapshot
 * @desc    Generate/refresh a snapshot on demand
 * @access  Private/Admin
 */
router.post(
  '/snapshot',
  validate(generateSnapshotSchema),
  dashboardStatsController.generateSnapshot,
);

/**
 * @route   GET /dashboard-stats
 * @desc    List stored snapshots (filterable, paginated)
 * @access  Private/Admin
 */
router.get(
  '/',
  validate(listSnapshotsQuerySchema, 'query'),
  dashboardStatsController.getAllSnapshots,
);

/**
 * @route   DELETE /dashboard-stats?olderThanDays=365
 * @desc    Bulk-delete snapshots older than N days
 * @access  Private/Admin
 */
router.delete(
  '/',
  validate(pruneDashboardStatsSchema, 'query'),
  dashboardStatsController.pruneSnapshots,
);

/**
 * @route   GET /dashboard-stats/:id
 * @desc    Get a single snapshot
 * @access  Private/Admin
 */
router.get(
  '/:id',
  validate(dashboardStatsIdSchema, 'params'),
  dashboardStatsController.getSnapshot,
);

/**
 * @route   DELETE /dashboard-stats/:id
 * @desc    Delete a single snapshot
 * @access  Private/Admin
 */
router.delete(
  '/:id',
  validate(dashboardStatsIdSchema, 'params'),
  dashboardStatsController.deleteSnapshot,
);

module.exports = router;
