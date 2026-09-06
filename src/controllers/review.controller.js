const reviewService = require('../services/review.service');
const catchAsync = require('../utils/catchAsync');

/**
 * Factory: creates a review for any resource type (track, course, session).
 * Usage: router.post('/', protect, reviewController.createReview('course'))
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
 * Factory: gets reviews for any resource type.
 * Usage: router.get('/', reviewController.getReviews('course'))
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

exports.deleteReview = catchAsync(async (req, res, next) => {
  await reviewService.deleteReview(req.params.reviewId);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
