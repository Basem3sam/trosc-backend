const Joi = require('joi');

exports.createContactSchema = Joi.object({
  username: Joi.string().required().trim().min(2).max(100).messages({
    'string.empty': 'Name is required',
  }),
  track: Joi.string().required().trim().messages({
    'string.empty': 'Track is required',
  }),
  email: Joi.string().required().trim().email().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email',
  }),
  phone: Joi.string()
    .required()
    .trim()
    .pattern(/^[0-9+\s\-()]{7,15}$/)
    .messages({
      'string.empty': 'Phone number is required',
      'string.pattern.base': 'Please provide a valid phone number',
    }),
  message: Joi.string().required().trim().min(10).messages({
    'string.empty': 'Message is required',
    'string.min': 'Message must be at least 10 characters',
  }),
});
