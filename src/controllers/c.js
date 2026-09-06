const reviewService = require('../services/review.service');
const catchAsync = require('../utils/catchAsync');

/**
 * Factory: returns a controller that creates a review for the given
 * resource type ('track' | 'course' | 'session'). The resource ID is
 * always read from req.params.id.
 */
exports.createReview = (resourceType) =>
  catchAsync(async (req, res, next) => {
    const review = await reviewService.createReview(
      resourceType,
      req.params.id,
      req.user.id,
      req.body,
    );

    res.status(201).json({
      status: 'success',
      data: { review },
    });
  });

/**
 * Factory: returns a controller that lists reviews for the given
 * resource type ('track' | 'course' | 'session').
 */
exports.getReviews = (resourceType) =>
  catchAsync(async (req, res, next) => {
    const { reviews, total, pagination } = await reviewService.getReviews(
      resourceType,
      req.params.id,
      req.query,
    );

    res.status(200).json({
      status: 'success',
      results: reviews.length,
      total,
      pagination,
      data: { reviews },
    });
  });
