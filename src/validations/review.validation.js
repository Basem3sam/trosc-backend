const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/, 'MongoDB ObjectId');

// Used for the :id param on any /tracks|courses|sessions/:id/reviews route
exports.resourceIdSchema = Joi.object({
  id: objectId.required().messages({
    'string.pattern.base': 'ID must be a valid MongoDB ID',
  }),
});

exports.createReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.base': 'Rating must be a number between 1 and 5',
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating must be at most 5',
    'any.required': 'Rating is required',
  }),
  content: Joi.string().required().trim().min(1).messages({
    'string.empty': 'Review content is required',
  }),
});

// Both :id (parent resource, from the mergeParams mount) and :reviewId
// are present on the delete route.
exports.deleteReviewSchema = Joi.object({
  id: objectId.required().messages({
    'string.pattern.base': 'ID must be a valid MongoDB ID',
  }),
  reviewId: objectId.required().messages({
    'string.pattern.base': 'Review ID must be a valid MongoDB ID',
  }),
});
