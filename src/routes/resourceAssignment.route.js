const express = require('express');
const assignmentController = require('../controllers/assignment.controller');
const {
  protect,
  restrictTo,
  checkOwnership,
} = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  resourceIdSchema,
  createAssignmentSchema,
} = require('../validations/assignment.validation');

// Maps the generic resourceType string to the Mongoose model name that
// checkOwnership needs to look up the parent Course/Session.
const MODEL_BY_RESOURCE_TYPE = {
  course: 'Course',
  session: 'Session',
};

/**
 * Factory: builds an assignments sub-router for a given resource type
 * ('course' | 'session'). Mount with mergeParams under '/:id/assignments'
 * on the parent resource's router — e.g.:
 *
 *   const resourceAssignmentRouter = require('./resourceAssignment.route');
 *   router.use('/:id/assignments', resourceAssignmentRouter('course'));
 *
 * Track-level assignment listing is handled separately by assignment.route.js
 * since it aggregates across multiple courses/sessions rather than querying
 * a single resource; tracks don't get a create route here since an
 * assignment must belong to exactly one course or standalone session,
 * never a track directly (see Assignment's pre-validate hook).
 */
module.exports = (resourceType) => {
  const router = express.Router({ mergeParams: true });

  router
    .route('/')
    .get(
      protect,
      validate(resourceIdSchema, 'params'),
      assignmentController.getResourceAssignments(resourceType),
    )
    .post(
      protect,
      restrictTo('admin', 'instructor'),
      validate(resourceIdSchema, 'params'),
      checkOwnership({
        model: MODEL_BY_RESOURCE_TYPE[resourceType],
        ownerField: 'instructor',
        paramName: 'id',
      }),
      validate(createAssignmentSchema),
      assignmentController.createAssignment(resourceType),
    );

  return router;
};
