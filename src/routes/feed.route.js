/**
 * @swagger
 * tags:
 *   - name: Feed
 *     description: Dashboard feed with announcements and events
 *
 * /feed:
 *   get:
 *     security: []
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
 *               $ref: '#/components/schemas/FeedResponse'
 */

const express = require('express');
const feedController = require('../controllers/feed.controller');

const router = express.Router();

router.get('/', feedController.getFeed);

module.exports = router;
