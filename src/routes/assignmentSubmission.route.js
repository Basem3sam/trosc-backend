/**
 * @swagger
 * /assignments/{id}/submissions:
 *   post:
 *     operationId: submitAssignment
 *     summary: Submit (or resubmit) your work for an assignment
 *     description: >
 *       The requesting student must be enrolled in the assignment's course
 *       or session. Submitting again overwrites the previous file and
 *       clears any existing grade — a new file means the old grade no
 *       longer applies. The response's top-level `late` flag reflects
 *       whether this submission landed after the deadline; it isn't stored.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, example: "6713b5ac12ef4567890a7777" }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 example: "https://drive.google.com/file/d/xyz"
 *     responses:
 *       200:
 *         description: Submission created or updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 late: { type: boolean, example: false }
 *                 data:
 *                   type: object
 *                   properties:
 *                     submission:
 *                       $ref: '#/components/schemas/Submission'
 *       400:
 *         description: Validation error (bad or untrusted file URL)
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Only enrolled students can submit this assignment
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /assignments/{id}/submissions/{studentId}/grade:
 *   patch:
 *     operationId: gradeSubmission
 *     summary: Grade a student's submission for an assignment
 *     description: Owner instructor (the assignment's own instructor) or admin only.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, example: "6713b5ac12ef4567890a7777" }
 *       - name: studentId
 *         in: path
 *         required: true
 *         schema: { type: string, example: "67123abc12ef4567890a1234" }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [grade]
 *             properties:
 *               grade:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 85
 *     responses:
 *       200:
 *         description: Submission graded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     submission:
 *                       $ref: '#/components/schemas/Submission'
 *       400:
 *         description: Validation error
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Assignment not found, or this student hasn't submitted yet
 */

const express = require('express');
const assignmentSubmissionController = require('../controllers/assignmentSubmission.controller');
const {
  protect,
  restrictTo,
  checkOwnership,
} = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  assignmentIdSchema,
  assignmentStudentIdSchema,
  submitAssignmentSchema,
  gradeSubmissionSchema,
} = require('../validations/assignmentSubmission.validation');

// Top-level, NOT nested under courses/sessions — mount at /v1/assignments
// in app.js. A single assignment is already globally unique by its own
// ID, so nesting under a parent course/session/track adds nothing here.
const router = express.Router();

router.post(
  '/:id/submissions',
  protect,
  validate(assignmentIdSchema, 'params'),
  validate(submitAssignmentSchema),
  assignmentSubmissionController.submitAssignment,
);

router.patch(
  '/:id/submissions/:studentId/grade',
  protect,
  restrictTo('admin', 'instructor'),
  validate(assignmentStudentIdSchema, 'params'),
  validate(gradeSubmissionSchema),
  checkOwnership({
    model: 'Assignment',
    ownerField: 'instructor',
    paramName: 'id',
  }),
  assignmentSubmissionController.gradeSubmission,
);

module.exports = router;
