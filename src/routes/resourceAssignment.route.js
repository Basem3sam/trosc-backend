const express = require('express');
const assignmentController = require('../controllers/assignment.controller');
const { protect } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { resourceIdSchema } = require('../validations/assignment.validation');

/**
 * Factory: builds an assignments-list sub-router for a given resource type
 * ('course' | 'session'). Mount with mergeParams under '/:id/assignments'
 * on the parent resource's router — e.g.:
 *
 *   const resourceAssignmentRouter = require('./resourceAssignment.route');
 *   router.use('/:id/assignments', resourceAssignmentRouter('course'));
 *
 * Track-level assignment listing is handled separately by assignment.route.js
 * since it aggregates across multiple courses/sessions rather than querying
 * a single resource.
 */
module.exports = (resourceType) => {
  const router = express.Router({ mergeParams: true });

  router.get(
    '/',
    protect,
    validate(resourceIdSchema, 'params'),
    assignmentController.getResourceAssignments(resourceType),
  );

  return router;
};
