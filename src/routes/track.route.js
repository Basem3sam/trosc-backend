/**
 * @swagger
 * tags:
 *   - name: Tracks
 *     description: Learning track management and session organization
 */

/**
 * @swagger
 * /tracks:
 *   post:
 *     summary: Create a new learning track
 *     description: Create a new track (admin and instructors only)
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TrackCreate'
 *           example:
 *             title: "Advanced JavaScript Mastery"
 *             description: "Deep dive into modern JavaScript concepts and patterns"
 *             instructor: "507f1f77bcf86cd799439011"
 *             level: "intermediate"
 *             coverImage: "js-advanced-cover.jpg"
 *             published: true
 *     responses:
 *       201:
 *         description: Track created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrackResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         description: Track title already exists
 *
 *   get:
 *     summary: Get all tracks
 *     description: Retrieve all tracks (public endpoint)
 *     tags: [Tracks]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *       - name: level
 *         in: query
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced, all]
 *       - name: published
 *         in: query
 *         schema:
 *           type: boolean
 *       - name: sort
 *         in: query
 *         schema:
 *           type: string
 *           example: "-createdAt"
 *     responses:
 *       200:
 *         description: List of tracks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TracksResponse'
 */

/**
 * @swagger
 * /tracks/{id}:
 *   get:
 *     summary: Get a specific track by ID
 *     description: Retrieve detailed information about a track (public endpoint)
 *     tags: [Tracks]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Track ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439021"
 *     responses:
 *       200:
 *         description: Track details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrackResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a track
 *     description: Update track information (admin and instructors only)
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439021"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TrackUpdate'
 *           example:
 *             title: "Updated JavaScript Track"
 *             description: "Completely revised curriculum with new content"
 *             level: "advanced"
 *             published: false
 *     responses:
 *       200:
 *         description: Track updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrackResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete a track
 *     description: Permanently delete a track (admin only)
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439021"
 *     responses:
 *       204:
 *         description: Track deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /tracks/{trackId}/sessions/{sessionId}:
 *   patch:
 *     summary: Add a session to a track
 *     description: Associate a session with a track (admin and instructors only)
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: trackId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439021"
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439031"
 *     responses:
 *       200:
 *         description: Session added to track successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrackResponse'
 *       400:
 *         description: Session already exists in track or invalid operation
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Track or session not found
 *
 *   delete:
 *     summary: Remove a session from a track
 *     description: Remove session association from a track (admin and instructors only)
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: trackId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439021"
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439031"
 *     responses:
 *       200:
 *         description: Session removed from track successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrackResponse'
 *       400:
 *         description: Session not found in track
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Track or session not found
 */

const express = require('express');
const trackController = require('../controllers/track.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createTrackSchema,
  getTrackSchema,
  updateTrackSchema,
  deleteTrackSchema,
  manageSessionSchema,
} = require('../validations/track.validation');

const router = express.Router();

// --- Standard CRUD for Tracks ---

router
  .route('/')
  .post(
    protect,
    restrictTo('admin', 'instructor'), // Only admins/instructors can create
    validate(createTrackSchema),
    trackController.createTrack,
  )
  .get(trackController.getAllTracks); // Publicly viewable

router
  .route('/:id')
  .get(validate(getTrackSchema, 'params'), trackController.getTrack) // Publicly viewable
  .patch(
    protect,
    restrictTo('admin', 'instructor'), // Only admins/instructors can update
    validate(updateTrackSchema),
    trackController.updateTrack,
  )
  .delete(
    protect,
    restrictTo('admin'), // Only admins can delete
    validate(deleteTrackSchema, 'params'),
    trackController.deleteTrack,
  );

// --- Session Management for a Track ---

router
  .route('/:trackId/sessions/:sessionId')
  .patch(
    protect,
    restrictTo('admin', 'instructor'), // Only admins/instructors can add
    validate(manageSessionSchema, 'params'),
    trackController.addSessionToTrack,
  )
  .delete(
    protect,
    restrictTo('admin', 'instructor'), // Only admins/instructors can remove
    validate(manageSessionSchema, 'params'),
    trackController.removeSessionFromTrack,
  );

module.exports = router;
