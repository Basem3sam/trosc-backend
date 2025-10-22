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
      return res.status(500).json({
        status: 'error',
        message: 'Invalid validation schema provided',
      });
    }

    const { error } = validationSchema.validate(req[source]);
    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: error.details[0].message,
      });
    }
    next();
  };

module.exports = validateMiddleware;
