const express = require('express');
const weeklyTaskController = require('../controllers/weeklyTask.controller');
const {
  protect,
  restrictTo,
  checkOwnership,
} = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  resourceIdSchema,
  createWeeklyTaskSchema,
} = require('../validations/weeklyTask.validation');

// Course-nested: mount with mergeParams under '/:id/weekly-tasks' on
// course.route.js. Handles create + list for a single course.
const router = express.Router({ mergeParams: true });

router
  .route('/')
  .post(
    protect,
    restrictTo('admin', 'instructor'),
    checkOwnership({ model: 'Course', ownerField: 'instructor', paramName: 'id' }),
    validate(resourceIdSchema, 'params'),
    validate(createWeeklyTaskSchema),
    weeklyTaskController.createWeeklyTask,
  )
  .get(
    protect,
    validate(resourceIdSchema, 'params'),
    weeklyTaskController.getCourseWeeklyTasks,
  );

module.exports = router;
