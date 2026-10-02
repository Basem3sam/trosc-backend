const express = require('express');
const assignmentController = require('../../controllers/assignment.controller');
const {
  protect,
  restrictTo,
  requireManage,
} = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const {
  resourceIdSchema,
  createAssignmentSchema,
} = require('../../validations/assignment.validation');

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
      // Stage 4: the PARENT course/session decides (its current
      // instructor, or its track's lead/co-instructors, or an admin).
      requireManage({ resource: resourceType }),
      validate(createAssignmentSchema),
      assignmentController.createAssignment(resourceType),
    );

  return router;
};
