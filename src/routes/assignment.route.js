const express = require('express');
const assignmentController = require('../controllers/assignment.controller');
const { protect } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { resourceIdSchema } = require('../validations/assignment.validation');

// mergeParams so :id from the parent /tracks/:id mount is visible here
const router = express.Router({ mergeParams: true });

router.get(
  '/',
  protect,
  validate(resourceIdSchema, 'params'),
  assignmentController.getTrackAssignments,
);

module.exports = router;
