const Joi = require('joi');
const photoValidation = require('../utils/photoValidation');

exports.signupSchema = Joi.object({
  name: Joi.string().min(2).max(50).trim().required().messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 50 characters',
  }),
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Please provide a valid email address',
    'string.empty': 'Email is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.empty': 'Password is required',
  }),
  passwordConfirm: Joi.any().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
    'any.required': 'Please confirm your password',
  }),
  photo: photoValidation,
  bio: Joi.string().max(500).trim().allow('').optional(),
  website: Joi.string().uri().allow('').optional(),
  socialMedia: Joi.object({
    twitter: Joi.string().uri().allow(''),
    linkedin: Joi.string().uri().allow(''),
    github: Joi.string().uri().allow(''),
  }).optional(),
});

exports.loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'string.empty': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
  }),
});

exports.updateMeSchema = Joi.object({
  name: Joi.string().min(2).max(50).trim().optional(),
  email: Joi.string().email().lowercase().trim().optional(),
  photo: photoValidation,
  bio: Joi.string().max(500).trim().allow('').optional(),
  website: Joi.string().uri().allow('').optional(),
  socialMedia: Joi.object({
    twitter: Joi.string().uri().allow(''),
    linkedin: Joi.string().uri().allow(''),
    github: Joi.string().uri().allow(''),
  }).optional(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

exports.updatePasswordSchema = Joi.object({
  passwordCurrent: Joi.string().required().messages({
    'string.empty': 'Current password is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.empty': 'New password is required',
  }),
  passwordConfirm: Joi.any().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
    'any.required': 'Please confirm your new password',
  }),
});

exports.forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'string.empty': 'Email is required',
  }),
});

exports.resetPasswordSchema = Joi.object({
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.empty': 'Password is required',
  }),
  passwordConfirm: Joi.any().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
    'any.required': 'Please confirm your password',
  }),
});

exports.userIdSchema = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    'string.hex': 'User ID must be a valid MongoDB ID',
    'string.length': 'User ID must be exactly 24 characters',
  }),
});

exports.adminCreateUserSchema = Joi.object({
  name: Joi.string().min(2).max(50).trim().required().messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters long',
  }),
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Please provide a valid email address',
    'string.empty': 'Email is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.empty': 'Password is required',
  }),
  passwordConfirm: Joi.any().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
    'any.required': 'Please confirm password',
  }),
  role: Joi.string().valid('student', 'instructor', 'admin').optional(),
  photo: photoValidation,
  bio: Joi.string().max(500).trim().allow('').optional(),
  website: Joi.string().uri().allow('').optional(),
  socialMedia: Joi.object({
    twitter: Joi.string().uri().allow(''),
    linkedin: Joi.string().uri().allow(''),
    github: Joi.string().uri().allow(''),
  }).optional(),
  active: Joi.boolean().default(true),
  emailVerified: Joi.boolean().default(false),
});

exports.adminUpdateUserSchema = Joi.object({
  name: Joi.string().min(2).max(50).trim().optional(),
  email: Joi.string().email().lowercase().trim().optional(),
  role: Joi.string().valid('student', 'instructor', 'admin').optional(),
  photo: photoValidation,
  bio: Joi.string().max(500).trim().allow('').optional(),
  website: Joi.string().uri().allow('').optional(),
  socialMedia: Joi.object({
    twitter: Joi.string().uri().allow(''),
    linkedin: Joi.string().uri().allow(''),
    github: Joi.string().uri().allow(''),
  }).optional(),
  active: Joi.boolean().optional(),
  emailVerified: Joi.boolean().optional(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

exports.bulkUserActionSchema = Joi.object({
  userIds: Joi.array()
    .items(Joi.string().hex().length(24).required())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one user ID must be provided',
      'string.hex': 'All user IDs must be valid MongoDB IDs',
    }),
  action: Joi.string().valid('activate', 'deactivate', 'delete').required(),
});

exports.passwordResetSchema = Joi.object({
  password: Joi.string().min(8).required(),
  passwordConfirm: Joi.any().valid(Joi.ref('password')).required(),
});

exports.passwordUpdateSchema = Joi.object({
  passwordCurrent: Joi.string().required(),
  password: Joi.string().min(8).required(),
  passwordConfirm: Joi.any().valid(Joi.ref('password')).required(),
});
