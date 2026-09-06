const Joi = require('joi');
const attachmentValidation = require('../utils/attachmentValidation');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/, 'MongoDB ObjectId');

// Used for the :id param on any /tracks|courses|sessions/:id/assignments route
exports.resourceIdSchema = Joi.object({
  id: objectId.required().messages({
    'string.pattern.base': 'ID must be a valid MongoDB ID',
  }),
});

exports.createAssignmentSchema = Joi.object({
  title: Joi.string().required().trim().min(3).max(200).messages({
    'string.empty': 'Assignment title is required',
  }),
  description: Joi.string().required().trim().min(10).messages({
    'string.empty': 'Assignment description is required',
  }),
  deadline: Joi.date().required().messages({
    'date.base': 'Deadline must be a valid date',
    'any.required': 'Deadline is required',
  }),
  attachments: attachmentValidation,
});

exports.updateAssignmentSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200),
  description: Joi.string().trim().min(10),
  deadline: Joi.date(),
  attachments: attachmentValidation,
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });
