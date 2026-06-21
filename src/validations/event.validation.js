const Joi = require('joi');
const photoValidation = require('../utils/photoValidation');
const attachmentValidation = require('../utils/attachmentValidation');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/, 'MongoDB ObjectId');

exports.createEventSchema = Joi.object({
  title: Joi.string().required().trim().min(3).max(200).messages({
    'string.empty': 'Event title is required',
    'string.min': 'Title must be at least 3 characters',
  }),
  description: Joi.string().required().trim().min(10).messages({
    'string.empty': 'Description is required',
    'string.min': 'Description must be at least 10 characters',
  }),
  track: objectId.optional(),
  course: objectId.optional(),
  date: Joi.date().required().messages({
    'date.base': 'Event date must be a valid date',
  }),
  locationType: Joi.string().valid('online', 'offline').required().messages({
    'any.only': 'Location type must be online or offline',
  }),
  locationLink: Joi.string()
    .uri()
    .allow('')
    .optional()
    .when('locationType', {
      is: 'online',
      then: Joi.string().uri().required().messages({
        'string.empty':
          'Online events require a meeting link (Zoom, Meet, etc.)',
        'string.uri': 'Location link must be a valid URL',
      }),
      otherwise: Joi.string().allow('').optional(),
    }),
  locationAddress: Joi.string()
    .trim()
    .allow('')
    .optional()
    .when('locationType', {
      is: 'offline',
      then: Joi.string().trim().min(3).required().messages({
        'string.empty': 'Offline events require a physical address',
      }),
      otherwise: Joi.string().allow('').optional(),
    }),
  coverImage: photoValidation,
  attachments: attachmentValidation,
});

exports.updateEventSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).optional(),
  description: Joi.string().trim().min(10).optional(),
  track: objectId.optional(),
  course: objectId.optional(),
  date: Joi.date().optional(),
  locationType: Joi.string().valid('online', 'offline').optional(),
  locationLink: Joi.string()
    .uri()
    .allow('')
    .optional()
    .when('locationType', {
      is: 'online',
      then: Joi.string().uri().required().messages({
        'string.empty': 'Online events require a meeting link',
        'string.uri': 'Location link must be a valid URL',
      }),
      otherwise: Joi.string().allow('').optional(),
    }),
  locationAddress: Joi.string()
    .trim()
    .allow('')
    .optional()
    .when('locationType', {
      is: 'offline',
      then: Joi.string().trim().min(3).required().messages({
        'string.empty': 'Offline events require a physical address',
      }),
      otherwise: Joi.string().allow('').optional(),
    }),
  coverImage: photoValidation,
  attachments: attachmentValidation,
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

exports.eventIdSchema = Joi.object({
  id: objectId.required().messages({
    'string.pattern.base': 'Event ID must be a valid MongoDB ID',
  }),
});
