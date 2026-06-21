const AppError = require('../utils/AppError');

const validateMiddleware =
  (schema, source = 'body') =>
  (req, res, next) => {
    // Handle different schema structures
    let validationSchema;

    if (schema.body || schema.params || schema.query) {
      // Schema has body/params/query structure
      validationSchema = schema[source];
    } else {
      // Schema is a direct Joi schema
      validationSchema = schema;
    }

    if (!validationSchema || typeof validationSchema.validate !== 'function') {
      return next(new AppError('Invalid validation schema provided', 500));
    }

    const { error } = validationSchema.validate(req[source]);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }
    next();
  };

module.exports = validateMiddleware;
