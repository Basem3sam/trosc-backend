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

    // Several routes stack multiple partial param validators back-to-back
    // against the SAME req.params object (e.g. getTrackSchema for `id`,
    // then studentIdSchema for `studentId` on
    // POST /tracks/:id/students/:studentId/approve). Each individual schema
    // only describes a subset of the keys actually present, so unknown-key
    // rejection must be disabled for 'params' or every validator after the
    // first one fails on the other's field(s).
    //
    // This is safe specifically for 'params': Express only ever populates
    // req.params with keys matching :placeholders in the route's own path
    // definition, so there is no way for a client to inject an unexpected
    // params key. 'body' and 'query' are real user-controlled input and
    // keep strict unknown-key rejection.
    const { error } = validationSchema.validate(req[source], {
      allowUnknown: source === 'params',
    });
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }
    next();
  };

module.exports = validateMiddleware;
