const Review = require('../models/review.model');
const Track = require('../models/track.model');
const Course = require('../models/course.model');
const Session = require('../models/session.model');
const AppError = require('../utils/AppError');
const APIFeatures = require('../utils/APIFeatures');

// Each reviewable resource type: its Mongoose model, the field on Review
// that stores the reference, and a human label for error messages.
const RESOURCE_CONFIG = {
  track: { Model: Track, field: 'track', label: 'track' },
  course: { Model: Course, field: 'course', label: 'course' },
  session: { Model: Session, field: 'session', label: 'session' },
};

function getConfig(resourceType) {
  const config = RESOURCE_CONFIG[resourceType];
  if (!config) {
    throw new Error(`Unknown reviewable resource type: ${resourceType}`);
  }
  return config;
}

/**
 * Create a review for a track, course, or session. Only students currently
 * enrolled in the resource may review it, and each student may review a
 * given resource once.
 * @param {'track'|'course'|'session'} resourceType
 * @param {string} resourceId
 * @param {string} userId
 * @param {Object} data - { rating, content }
 * @returns {Promise<Review>}
 */
exports.createReview = async (resourceType, resourceId, userId, data) => {
  const { Model, field, label } = getConfig(resourceType);

  const resource = await Model.findById(resourceId).select('students');
  if (!resource) {
    throw new AppError(`No ${label} found with that ID`, 404);
  }

  const isEnrolled = resource.students.some(
    (studentId) => studentId.toString() === userId,
  );
  if (!isEnrolled) {
    throw new AppError(`Only enrolled students can review this ${label}`, 403);
  }

  const existing = await Review.findOne({ [field]: resourceId, user: userId });
  if (existing) {
    throw new AppError(`You have already reviewed this ${label}`, 400);
  }

  const review = await Review.create({
    [field]: resourceId,
    user: userId,
    rating: data.rating,
    content: data.content,
  });

  return review;
};

/**
 * Get all reviews for a track, course, or session, newest first.
 * @param {'track'|'course'|'session'} resourceType
 * @param {string} resourceId
 * @param {Object} query - req.query (page, limit, sort, etc.)
 * @returns {Promise<{ reviews, total, pagination }>}
 */
exports.getReviews = async (resourceType, resourceId, query) => {
  const { Model, field, label } = getConfig(resourceType);

  const resource = await Model.findById(resourceId).select('_id');
  if (!resource) {
    throw new AppError(`No ${label} found with that ID`, 404);
  }

  const baseQuery = Review.find({ [field]: resourceId }).sort({
    createdAt: -1,
  });
  const features = new APIFeatures(baseQuery, query, Review).limitFields();

  await features.paginate();
  const reviews = await features.query.populate('user', 'name photo');

  return {
    reviews: reviews || [],
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};

/**
 * Delete a review. Authorization (author or admin) is enforced by the
 * checkOwnership middleware before this runs.
 * @param {string} reviewId
 */
exports.deleteReview = async (reviewId) => {
  const review = await Review.findByIdAndDelete(reviewId);
  if (!review) {
    throw new AppError('No review found with that ID', 404);
  }
  return null;
};
