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
 *     operationId: createTrack
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
 *     operationId: getAllTracks
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
 *     operationId: getTrackById
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
 *     operationId: updateTrackById
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
 *     operationId: deleteTrackById
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
 *     operationId: addSessionToTrack
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
 *     operationId: removeSessionFromTrack
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

/**
 * @swagger
 * /tracks/{id}/students:
 *   post:
 *     operationId: addStudentToTrack
 *     summary: Enroll a student in a track
 *     description: Enroll a student in a track (admin and instructors only)
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
 *             type: object
 *             required:
 *               - studentId
 *             properties:
 *               studentId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Student enrolled in track successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrackResponse'
 *       400:
 *         description: Student already enrolled in this track
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Track not found
 */

/**
 * @swagger
 * /tracks/{id}/students/{studentId}:
 *   delete:
 *     operationId: removeStudentFromTrack
 *     summary: Remove a student from a track
 *     description: Unenroll a student from a track (admin and instructors only)
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
 *       - name: studentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Student removed from track successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrackResponse'
 *       400:
 *         description: Student is not enrolled in this track
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Track or student not found
 */

/**
 * @swagger
 * /tracks/popular:
 *   get:
 *     operationId: getPopularTracks
 *     summary: Get most popular tracks
 *     description: Retrieve tracks sorted by student enrollment count (public endpoint)
 *     tags: [Tracks]
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *           example: 5
 *     responses:
 *       200:
 *         description: List of popular tracks retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 results:
 *                   type: integer
 *                   example: 5
 *                 data:
 *                   type: object
 *                   properties:
 *                     tracks:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Track'
 */

/**
 * @swagger
 * /tracks/{id}/analytics:
 *   get:
 *     operationId: getTrackAnalytics
 *     summary: Get track analytics
 *     description: Retrieve statistics and analytics for a specific track (admin and instructors only)
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
 *       200:
 *         description: Track analytics retrieved
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
 *                     analytics:
 *                       type: object
 *                       properties:
 *                         totalStudents:
 *                           type: integer
 *                           example: 42
 *                         totalSessions:
 *                           type: integer
 *                           example: 12
 *                         enrollmentRate:
 *                           type: integer
 *                           example: 42
 *                         completionRate:
 *                           type: integer
 *                           example: 0
 *                         averageEngagement:
 *                           type: integer
 *                           example: 0
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /tracks/{id}/enroll-me:
 *   post:
 *     operationId: enrollMeInTrack
 *     summary: Self-enroll in a track
 *     description: Allow a student to enroll themselves in a published track
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
 *       200:
 *         description: Enrolled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrackResponse'
 *       400:
 *         description: Already enrolled or track not published
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
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
  manageCourseSchema,
  addStudentSchema,
  studentIdSchema,
} = require('../validations/track.validation');

const router = express.Router();

// --- POPULAR TRACKS (must be before /:id) ---

router.get('/popular', trackController.getPopularTracks);

// --- Standard CRUD for Tracks ---

router
  .route('/')
  .post(
    protect,
    restrictTo('admin', 'instructor'),
    validate(createTrackSchema),
    trackController.createTrack,
  )
  .get(trackController.getAllTracks);

// --- TRACK ANALYTICS (must be before /:id) ---

router.get(
  '/:id/analytics',
  protect,
  restrictTo('admin', 'instructor'),
  validate(getTrackSchema, 'params'),
  trackController.getTrackAnalytics,
);

router
  .route('/:id')
  .get(validate(getTrackSchema, 'params'), trackController.getTrack)
  .patch(
    protect,
    restrictTo('admin', 'instructor'),
    validate(getTrackSchema, 'params'),
    validate(updateTrackSchema),
    trackController.updateTrack,
  )
  .delete(
    protect,
    restrictTo('admin'),
    validate(deleteTrackSchema, 'params'),
    trackController.deleteTrack,
  );

// --- Course - Session Management for a Track ---

router
  .route('/:trackId/courses/:courseId')
  .patch(
    protect,
    restrictTo('admin', 'instructor'),
    validate(manageCourseSchema, 'params'), // Reuse or create manageCourseSchema
    trackController.addCourseToTrack,
  )
  .delete(
    protect,
    restrictTo('admin', 'instructor'),
    validate(manageCourseSchema, 'params'),
    trackController.removeCourseFromTrack,
  );

router
  .route('/:trackId/sessions/:sessionId')
  .patch(
    protect,
    restrictTo('admin', 'instructor'),
    validate(manageSessionSchema, 'params'),
    trackController.addSessionToTrack,
  )
  .delete(
    protect,
    restrictTo('admin', 'instructor'),
    validate(manageSessionSchema, 'params'),
    trackController.removeSessionFromTrack,
  );

// --- STUDENT ENROLLMENT FOR TRACKS ---

router
  .route('/:id/students')
  .post(
    protect,
    restrictTo('admin', 'instructor'),
    validate(getTrackSchema, 'params'),
    validate(addStudentSchema),
    trackController.addStudent,
  );

router
  .route('/:id/students/:studentId')
  .delete(
    protect,
    restrictTo('admin', 'instructor'),
    validate(getTrackSchema, 'params'),
    validate(studentIdSchema, 'params'),
    trackController.removeStudent,
  );

router
  .route('/:id/enroll-me')
  .post(protect, validate(getTrackSchema, 'params'), trackController.enrollMe);

module.exports = router;
