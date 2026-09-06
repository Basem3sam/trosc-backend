/**
 * @swagger
 * tags:
 *   - name: Weekly Tasks
 *     description: Per-item completion tracking and task deletion (top-level, not nested under a course/track)
 */

/**
 * @swagger
 * /weekly-tasks/{taskId}:
 *   patch:
 *     operationId: updateWeeklyTask
 *     summary: Update a weekly task's week, title, and/or items
 *     description: >
 *       Owner instructor or admin only. Items sent with their existing `_id`
 *       are edited in place, preserving students' completion history for that
 *       item. Items sent without an `_id` are treated as new. Any previously
 *       existing item left out of the new `items` array is removed, along
 *       with its now-orphaned completion records.
 *     tags: [Weekly Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: taskId
 *         in: path
 *         required: true
 *         schema: { type: string, example: "6713b5ac12ef4567890a6666" }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: At least one of week, title, or items must be provided.
 *             properties:
 *               week: { type: integer, example: 2 }
 *               title: { type: string, example: "Week 2: Advanced Routing" }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [title]
 *                   properties:
 *                     _id:
 *                       type: string
 *                       description: Include to edit this item in place; omit to create a new item.
 *                       example: 6713b5ac12ef4567890aaaa1
 *                     title: { type: string, example: "Read Chapter 2" }
 *                     type:
 *                       type: string
 *                       enum: [reading, quiz, video, assignment, other]
 *                       example: reading
 *     responses:
 *       200:
 *         description: Weekly task updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     task:
 *                       $ref: '#/components/schemas/WeeklyTask'
 *       400:
 *         description: Week already exists for this course / validation error
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
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
  updateWeeklyTaskSchema,
} = require('../validations/weeklyTask.validation');

// Top-level, NOT nested under courses/tracks — mount at /v1/weekly-tasks
// in app.js. Handles editing/deleting a task and per-student item
// completion, all of which are keyed by the task's own ID.
const router = express.Router();

router
  .route('/:taskId')
  .patch(
    protect,
    validate(taskIdSchema, 'params'),
    validate(updateWeeklyTaskSchema),
    checkOwnership({
      model: 'WeeklyTask',
      ownerField: 'instructor',
      paramName: 'taskId',
    }),
    weeklyTaskController.updateWeeklyTask,
  )
  .delete(
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
