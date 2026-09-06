const express = require('express');
const weeklyTaskController = require('../controllers/weeklyTask.controller');
const { protect } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { resourceIdSchema } = require('../validations/weeklyTask.validation');

// Track-nested: mount with mergeParams under '/:id/weekly-tasks' on
// track.route.js. Read-only aggregate across every course in the track.
const router = express.Router({ mergeParams: true });

router.get(
  '/',
  protect,
  validate(resourceIdSchema, 'params'),
  weeklyTaskController.getTrackWeeklyTasks,
);

module.exports = router;
