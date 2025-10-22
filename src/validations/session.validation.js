const Joi = require('joi');

const resourceValidation = Joi.object({
  title: Joi.string().required().messages({
    'string.empty': 'Resource title is required.',
    'any.required': 'Resource title is required.',
  }),
  url: Joi.string().uri().required().messages({
    'string.empty': 'Resource URL is required.',
    'string.uri': 'Resource URL must be a valid URL.',
    'any.required': 'Resource URL is required.',
  }),
});

const createSessionValidation = Joi.object({
  title: Joi.string().trim().required().messages({
    'string.empty': 'Session title is required.',
    'any.required': 'Session title is required.',
  }),
  description: Joi.string().trim().optional().allow(''),
  instructor: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Instructor must be a valid MongoDB ID.',
    'string.length': 'Instructor must be a valid MongoDB ID.',
    'any.required': 'Instructor is required.',
  }),
  students: Joi.array().items(Joi.string().hex().length(24)).optional(),
  track: Joi.string().hex().length(24).optional().allow('').messages({
    'string.hex': 'Track must be a valid MongoDB ID.',
    'string.length': 'Track must be a valid MongoDB ID.',
  }),
  isStandalone: Joi.boolean().default(false),
  duration: Joi.number().integer().min(1).optional().messages({
    'number.min': 'Duration must be at least 1 minute.',
  }),
  level: Joi.string()
    .valid('beginner', 'intermediate', 'advanced')
    .default('beginner'),
  coverImage: Joi.string().uri().optional().allow('').messages({
    'string.uri': 'Cover image must be a valid URL.',
  }),
  resources: Joi.array().items(resourceValidation).optional(),
  published: Joi.boolean().default(false),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional().min(Joi.ref('startDate')).messages({
    'date.min': 'End date must be after start date.',
  }),
});

const updateSessionValidation = Joi.object({
  title: Joi.string().trim().optional(),
  description: Joi.string().trim().optional().allow(''),
  instructor: Joi.string().hex().length(24).optional().messages({
    'string.hex': 'Instructor must be a valid MongoDB ID.',
    'string.length': 'Instructor must be a valid MongoDB ID.',
  }),
  students: Joi.array().items(Joi.string().hex().length(24)).optional(),
  track: Joi.string().hex().length(24).optional().allow('').messages({
    'string.hex': 'Track must be a valid MongoDB ID.',
    'string.length': 'Track must be a valid MongoDB ID.',
  }),
  isStandalone: Joi.boolean().optional(),
  duration: Joi.number().integer().min(1).optional().messages({
    'number.min': 'Duration must be at least 1 minute.',
  }),
  level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
  coverImage: Joi.string().uri().optional().allow('').messages({
    'string.uri': 'Cover image must be a valid URL.',
  }),
  resources: Joi.array().items(resourceValidation).optional(),
  published: Joi.boolean().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional().min(Joi.ref('startDate')).messages({
    'date.min': 'End date must be after start date.',
  }),
}).min(1);

const sessionIdValidation = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Session ID must be a valid MongoDB ID.',
    'string.length': 'Session ID must be a valid MongoDB ID.',
    'any.required': 'Session ID is required.',
  }),
});

const addStudentValidation = Joi.object({
  studentId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Student ID must be a valid MongoDB ID.',
    'string.length': 'Student ID must be a valid MongoDB ID.',
    'any.required': 'Student ID is required.',
  }),
});

module.exports = {
  createSessionValidation,
  updateSessionValidation,
  sessionIdValidation,
  addStudentValidation,
};
