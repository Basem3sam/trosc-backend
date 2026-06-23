/**
 * @swagger
 * tags:
 *   - name: Sessions
 *     description: Learning session management and student enrollment
 */

/**
 * @swagger
 * /sessions:
 *   post:
 *     operationId: createSession
 *     summary: Create a new learning session
 *     description: Create a new session (admin and instructors only)
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SessionCreate'
 *     responses:
 *       201:
 *         description: Session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessionResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     operationId: getAllSessions
 *     summary: Get all sessions
 *     description: |
 *       Retrieve all sessions with filtering and pagination.
 *       **Note:** The list view unconditionally omits `url`, `embedUrl`, and `resources`.
 *       Full content is only returned in `GET /:id` for enrolled users.
 *       Supports MongoDB-style query filters, e.g.
 *       `?level=intermediate&published=true`.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
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
 *           enum: [beginner, intermediate, advanced]
 *       - name: published
 *         in: query
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of sessions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessionsResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /sessions/{id}:
 *   get:
 *     operationId: getSessionById
 *     summary: Get a specific session by ID
 *     description: |
 *       Retrieve detailed information about a session.
 *       `url`, `embedUrl`, and `resources` are stripped if the caller is
 *       not enrolled in the session, its parent track, or its parent course.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessionResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     operationId: updateSessionById
 *     summary: Update a session
 *     description: Update session information (admin and instructors only)
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SessionUpdate'
 *     responses:
 *       200:
 *         description: Session updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessionResponse'
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
 *     operationId: deleteSessionById
 *     summary: Delete a session
 *     description: Permanently delete a session (admin and instructors only). Instructors can only delete sessions they created.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Session deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /sessions/{id}/students:
 *   post:
 *     operationId: addStudentToSession
 *     summary: Add student to session
 *     description: Enroll a student in a session (admin and instructors only)
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: Student added to session successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessionResponse'
 *       400:
 *         description: Student already enrolled in this session
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Session not found
 */

/**
 * @swagger
 * /sessions/{id}/students/{studentId}:
 *   delete:
 *     operationId: removeStudentFromSession
 *     summary: Remove student from session
 *     description: Remove a student from a session (admin and instructors only)
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439031"
 *       - name: studentId
 *         in: path
 *         required: true
 *         description: MongoDB ID of the student to remove
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Student removed from session successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessionResponse'
 *       400:
 *         description: Student is not enrolled in this session
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Session or student not found
 */

/**
 * @swagger
 * /sessions/instructor/{instructorId}:
 *   get:
 *     operationId: getSessionsByInstructor
 *     summary: Get sessions by instructor
 *     tags: [Sessions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: instructorId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: List of sessions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessionsResponse'
 *       404: { description: Instructor not found }
 *
 * /sessions/track/{trackId}:
 *   get:
 *     operationId: getSessionsByTrack
 *     summary: Get sessions by track
 *     tags: [Sessions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: trackId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: List of sessions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessionsResponse'
 *       404: { description: Track not found }
 *
 * /sessions/{id}/enroll-me:
 *   post:
 *     operationId: enrollMeInSession
 *     summary: Self-enroll in a session
 *     tags: [Sessions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Enrolled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessionResponse'
 *       400: { description: Already enrolled }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: Track-only session without membership }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 * /sessions/{id}/leave-me:
 *   delete:
 *     operationId: leaveMeFromSession
 *     summary: Leave a session
 *     tags: [Sessions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Left successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessionResponse'
 *       400: { description: Not enrolled }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

const express = require('express');
const sessionController = require('../controllers/session.controller');
const {
  protect,
  restrictTo,
  checkOwnership,
} = require('../middlewares/auth.middleware');
const validateMiddleware = require('../middlewares/validate.middleware');
const {
  createSessionValidation,
  updateSessionValidation,
  sessionIdValidation,
  addStudentValidation,
  studentIdParamValidation,
} = require('../validations/session.validation');
const { authLimiter } = require('../middlewares/rateLimit.middleware');

const router = express.Router();

// Protect all routes
router.use(protect);

// ===================================================================
// 📚 MAIN SESSION ROUTES
// ===================================================================

router
  .route('/')
  .post(
    restrictTo('admin', 'instructor'),
    validateMiddleware(createSessionValidation),
    sessionController.createSession,
  )
  .get(sessionController.getAllSessions);

// ===================================================================
// 🔍 FILTERING ROUTES
// ===================================================================

router.get(
  '/instructor/:instructorId',
  sessionController.getSessionsByInstructor,
);

router.get('/track/:trackId', sessionController.getSessionsByTrack);

router.post('/:id/enroll-me', authLimiter, protect, sessionController.enrollMe);

router.delete('/:id/leave-me', authLimiter, protect, sessionController.leaveMe);

router
  .route('/:id')
  .get(
    validateMiddleware(sessionIdValidation, 'params'),
    sessionController.getSession,
  )
  .patch(
    restrictTo('admin', 'instructor'),
    validateMiddleware(sessionIdValidation, 'params'),
    checkOwnership({
      model: 'Session',
      ownerField: 'instructor',
      paramName: 'id',
    }),
    validateMiddleware(updateSessionValidation),
    sessionController.updateSession,
  )
  .delete(
    restrictTo('admin', 'instructor'),
    validateMiddleware(sessionIdValidation, 'params'),
    checkOwnership({
      model: 'Session',
      ownerField: 'instructor',
      paramName: 'id',
    }),
    sessionController.deleteSession,
  );

// ===================================================================
// 👥 STUDENT MANAGEMENT ROUTES
// ===================================================================

router.route('/:id/students').post(
  restrictTo('admin', 'instructor'),
  validateMiddleware(sessionIdValidation, 'params'),
  checkOwnership({
    model: 'Session',
    ownerField: 'instructor',
    paramName: 'id',
  }),
  validateMiddleware(addStudentValidation),
  sessionController.addStudent,
);

router.route('/:id/students/:studentId').delete(
  restrictTo('admin', 'instructor'),
  validateMiddleware(sessionIdValidation, 'params'),
  validateMiddleware(studentIdParamValidation, 'params'),
  checkOwnership({
    model: 'Session',
    ownerField: 'instructor',
    paramName: 'id',
  }),
  sessionController.removeStudent,
);

module.exports = router;
