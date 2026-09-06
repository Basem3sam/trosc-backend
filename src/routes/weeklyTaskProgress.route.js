/**
 * @swagger
 * tags:
 *   - name: Weekly Tasks
 *     description: Per-item completion tracking and task deletion (top-level, not nested under a course/track)
 */

/**
 * @swagger
 * /weekly-tasks/{taskId}:
 *   delete:
 *     operationId: deleteWeeklyTask
 *     summary: Delete a weekly task
 *     description: Owner instructor or admin only.
 *     tags: [Weekly Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: taskId
 *         in: path
 *         required: true
 *         schema: { type: string, example: "6713b5ac12ef4567890a6666" }
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

/**
 * @swagger
 * /weekly-tasks/{taskId}/items/{itemId}/complete:
 *   post:
 *     operationId: completeWeeklyTaskItem
 *     summary: Mark a weekly task item as completed
 *     description: The requesting student must be enrolled in the task's course. Idempotent.
 *     tags: [Weekly Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: taskId
 *         in: path
 *         required: true
 *         schema: { type: string, example: "6713b5ac12ef4567890a6666" }
 *       - name: itemId
 *         in: path
 *         required: true
 *         schema: { type: string, example: "6713b5ac12ef4567890aaaa1" }
 *     responses:
 *       200:
 *         description: Item marked as completed
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Only enrolled students can track progress on this weekly task
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     operationId: uncompleteWeeklyTaskItem
 *     summary: Unmark a weekly task item as completed
 *     description: The requesting student must be enrolled in the task's course. Idempotent.
 *     tags: [Weekly Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: taskId
 *         in: path
 *         required: true
 *         schema: { type: string, example: "6713b5ac12ef4567890a6666" }
 *       - name: itemId
 *         in: path
 *         required: true
 *         schema: { type: string, example: "6713b5ac12ef4567890aaaa1" }
 *     responses:
 *       200:
 *         description: Item marked as incomplete
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Only enrolled students can track progress on this weekly task
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

const express = require('express');
const weeklyTaskController = require('../controllers/weeklyTask.controller');
const {
  protect,
  checkOwnership,
} = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  taskIdSchema,
  taskItemIdSchema,
} = require('../validations/weeklyTask.validation');

// Top-level, NOT nested under courses/tracks — mount at /v1/weekly-tasks
// in app.js. Handles deleting a task and per-student item completion,
// both of which are keyed by the task's own ID.
const router = express.Router();

router.delete(
  '/:taskId',
  protect,
  validate(taskIdSchema, 'params'),
  checkOwnership({
    model: 'WeeklyTask',
    ownerField: 'instructor',
    paramName: 'taskId',
  }),
  weeklyTaskController.deleteWeeklyTask,
);

router
  .route('/:taskId/items/:itemId/complete')
  .post(
    protect,
    validate(taskItemIdSchema, 'params'),
    weeklyTaskController.completeItem,
  )
  .delete(
    protect,
    validate(taskItemIdSchema, 'params'),
    weeklyTaskController.uncompleteItem,
  );

module.exports = router;
