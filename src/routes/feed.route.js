/**
 * @swagger
 * tags:
 *   - name: Feed
 *     description: Dashboard feed with announcements and events
 *
 * /feed:
 *   get:
 *     operationId: getFeed
 *     summary: Get dashboard feed
 *     description: Returns pinned announcements and upcoming events for the dashboard
 *     tags: [Feed]
 *     responses:
 *       200:
 *         description: Feed data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     announcements:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Announcement'
 *                     upcomingEvents:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Event'
 */

const express = require('express');
const feedController = require('../controllers/feed.controller');

const router = express.Router();

router.get('/', feedController.getFeed);

module.exports = router;
