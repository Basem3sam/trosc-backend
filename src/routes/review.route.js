const express = require('express');
const reviewController = require('../controllers/review.controller');
const { protect } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  resourceIdSchema,
  createReviewSchema,
} = require('../validations/review.validation');

/**
 * Factory: builds a reviews sub-router for a given resource type
 * ('track' | 'course' | 'session'). Mount with mergeParams under
 * '/:id/reviews' on the parent resource's router — e.g.:
 *
 *   const reviewRouter = require('./review.route');
 *   router.use('/:id/reviews', reviewRouter('track'));
 *
 * The @swagger docs for each mount point live in the parent route file
 * (track.route.js / course.route.js / session.route.js) since the path
 * differs per resource type and this factory is generic.
 */
module.exports = (resourceType) => {
  const router = express.Router({ mergeParams: true });

  router
    .route('/')
    .post(
      protect,
      validate(resourceIdSchema, 'params'),
      validate(createReviewSchema),
      reviewController.createReview(resourceType),
    )
    .get(
      validate(resourceIdSchema, 'params'),
      reviewController.getReviews(resourceType),
    );

  return router;
};
