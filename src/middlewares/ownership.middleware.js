const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * Middleware factory to check if the current user owns the resource
 * or is an admin. Works for any model with an 'instructor' or 'createdBy' field.
 *
 * @param {Object} options
 * @param {string} options.model - Mongoose model name (e.g., 'Track', 'Course')
 * @param {string} options.ownerField - Field name for owner reference ('instructor' | 'createdBy')
 * @param {string} options.paramName - Route param containing the resource ID ('id' | 'trackId' | 'courseId' etc.)
 */
const checkOwnership = (options) =>
  catchAsync(async (req, res, next) => {
    const { model, ownerField = 'instructor', paramName = 'id' } = options;

    // Admin bypass — admins can edit anything
    if (req.user.role === 'admin') return next();

    // Load the model dynamically
    const Model = require(`../models/${model.toLowerCase()}.model`);
    const resourceId = req.params[paramName];

    const resource = await Model.findById(resourceId).select(ownerField);

    if (!resource) {
      return next(new AppError(`${model} not found`, 404));
    }

    // Compare owner to current user
    const ownerId = (
      resource[ownerField]?._id || resource[ownerField]
    )?.toString();
    if (ownerId !== req.user.id) {
      return next(new AppError('You can only modify your own content', 403));
    }

    next();
  });

module.exports = { checkOwnership };
