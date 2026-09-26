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
 *     tags: [Assignments]
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
 *     tags: [Assignments]
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
 *               feedback:
 *                 type: string
 *                 maxLength: 2000
 *                 example: "Solid work overall — watch your edge cases in the last function."
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

/**
 * @swagger
 * /assignments/{id}:
 *   get:
 *     operationId: getAssignment
 *     summary: Get a single assignment with its submissions
 *     description: Owner instructor (the assignment's own instructor) or admin only. Each submission's `file` is stripped in favor of a `hasFile` boolean — use the dedicated file endpoint below to actually access it.
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, example: "6713b5ac12ef4567890a7777" }
 *     responses:
 *       200:
 *         description: Assignment retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     assignment:
 *                       $ref: '#/components/schemas/Assignment'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /assignments/{id}/submissions/{studentId}/file:
 *   get:
 *     operationId: getSubmissionFile
 *     summary: Open a student's submitted file
 *     description: >
 *       Owner instructor (the assignment's own instructor) or admin only.
 *       Redirects (302) to the submission's file. This is the only path
 *       that ever exposes the raw file URL — students never receive it
 *       for anyone but themselves, and GET /assignments/{id} strips it
 *       from the submissions list.
 *     tags: [Assignments]
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
 *     responses:
 *       302:
 *         description: Redirects to the submitted file
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Assignment not found, or this student hasn't submitted yet
 */

/**
 * @swagger
 * /assignments/{id}:
 *   patch:
 *     operationId: updateAssignment
 *     summary: Update an assignment's title, description, deadline, and/or attachments
 *     description: Owner instructor (the assignment's own instructor) or admin only.
 *     tags: [Assignments]
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
 *             $ref: '#/components/schemas/AssignmentUpdate'
 *     responses:
 *       200:
 *         description: Assignment updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     assignment:
 *                       $ref: '#/components/schemas/Assignment'
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
 *     operationId: deleteAssignment
 *     summary: Delete an assignment
 *     description: Owner instructor or admin only. Also deletes all of its submissions.
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, example: "6713b5ac12ef4567890a7777" }
 *     responses:
 *       204:
 *         description: Deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

const express = require('express');
const assignmentSubmissionController = require('../../controllers/assignmentSubmission.controller');
const assignmentController = require('../../controllers/assignment.controller');
const {
  updateAssignmentSchema,
} = require('../../validations/assignment.validation');

const {
  protect,
  restrictTo,
  checkOwnership,
} = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const {
  assignmentIdSchema,
  assignmentStudentIdSchema,
  submitAssignmentSchema,
  gradeSubmissionSchema,
} = require('../../validations/assignmentSubmission.validation');

// Top-level, NOT nested under courses/sessions — mount at /v1/assignments
// in app.js. A single assignment is already globally unique by its own
// ID, so nesting under a parent course/session/track adds nothing here.
const router = express.Router();

router.get(
  '/:id',
  protect,
  restrictTo('admin', 'instructor'),
  validate(assignmentIdSchema, 'params'),
  checkOwnership({
    model: 'Assignment',
    ownerField: 'instructor',
    paramName: 'id',
  }),
  assignmentController.getAssignment,
);

router.get(
  '/:id/submissions/:studentId/file',
  protect,
  restrictTo('admin', 'instructor'),
  validate(assignmentStudentIdSchema, 'params'),
  checkOwnership({
    model: 'Assignment',
    ownerField: 'instructor',
    paramName: 'id',
  }),
  assignmentSubmissionController.getSubmissionFile,
);

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

router.patch(
  '/:id',
  protect,
  restrictTo('admin', 'instructor'),
  validate(assignmentIdSchema, 'params'),
  checkOwnership({
    model: 'Assignment',
    ownerField: 'instructor',
    paramName: 'id',
  }),
  validate(updateAssignmentSchema),
  assignmentController.updateAssignment,
);

router.delete(
  '/:id',
  protect,
  restrictTo('admin', 'instructor'),
  validate(assignmentIdSchema, 'params'),
  checkOwnership({
    model: 'Assignment',
    ownerField: 'instructor',
    paramName: 'id',
  }),
  assignmentController.deleteAssignment,
);

module.exports = router;
