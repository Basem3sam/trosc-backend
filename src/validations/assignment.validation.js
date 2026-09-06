const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/, 'MongoDB ObjectId');

// Used for the :id param on any /tracks|courses|sessions/:id/assignments route
exports.resourceIdSchema = Joi.object({
  id: objectId.required().messages({
    'string.pattern.base': 'ID must be a valid MongoDB ID',
  }),
});
