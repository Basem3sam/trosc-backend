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
    const { error, value } = validationSchema.validate(req[source], {
      allowUnknown: source === 'params',
    });
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }
    // E9: Joi's `value` here is the coerced/defaulted output (Joi
    // .default(...), .trim(), lowercase email, string→number, etc). The
    // old code discarded it and left req[source] as the raw input, so
    // every default and coercion was silently lost — downstream code had
    // to re-implement defaults defensively (see dashboardStats.controller.js
    // for a documented example). Writing it back makes req.body/query/params
    // reflect what was actually validated.
    req[source] = value;
    next();
  };

module.exports = validateMiddleware;
