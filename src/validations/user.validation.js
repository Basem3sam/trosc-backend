const Joi = require('joi');
const photoValidation = require('../utils/photoValidation');

// Optional: Strong password regex (enable if needed)
// const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

// ─── Signup Validation ─────────────────────────────
exports.signupSchema = Joi.object({
  name: Joi.string().min(3).max(50).trim().required().messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 3 characters long',
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
  photo: photoValidation, // ✅ FIXED: Using custom validation
  bio: Joi.string().max(200).trim().allow('').optional(),
  role: Joi.string().valid('student', 'instructor', 'admin').default('student'), // ✅ ADDED: Role field
});

// ─── Login Validation ──────────────────────────────
exports.loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'string.empty': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
  }),
});

// ─── Update Profile Validation ─────────────────────
exports.updateMeSchema = Joi.object({
  name: Joi.string().min(3).max(50).trim().optional(),
  email: Joi.string().email().lowercase().trim().optional(),
  photo: photoValidation, // ✅ FIXED: Using custom validation
  bio: Joi.string().max(500).trim().allow('').optional(), // ✅ INCREASED: More realistic bio length
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

// ─── Update Password Validation ────────────────────
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

// ─── Forgot Password Validation ────────────────────
exports.forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'string.empty': 'Email is required',
  }),
});

// ─── Reset Password Validation ─────────────────────
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

// ─── User ID Validation ────────────────────────────
exports.userIdSchema = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    'string.hex': 'User ID must be a valid MongoDB ID',
    'string.length': 'User ID must be exactly 24 characters',
  }),
});

// ─── Admin Create User Validation ──────────────────
exports.adminCreateUserSchema = Joi.object({
  name: Joi.string().min(3).max(50).trim().required().messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 3 characters long',
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
  role: Joi.string().valid('student', 'instructor', 'admin').default('student'),
  photo: photoValidation, // ✅ FIXED: Using custom validation
  bio: Joi.string().max(500).trim().allow('').optional(),
  isActive: Joi.boolean().default(true),
  isEmailVerified: Joi.boolean().default(false),
});

// ─── Admin Update User Validation ──────────────────
exports.adminUpdateUserSchema = Joi.object({
  name: Joi.string().min(3).max(50).trim().optional(),
  email: Joi.string().email().lowercase().trim().optional(),
  role: Joi.string().valid('student', 'instructor', 'admin').optional(),
  photo: photoValidation, // ✅ FIXED: Using custom validation
  bio: Joi.string().max(500).trim().allow('').optional(),
  isActive: Joi.boolean().optional(),
  isEmailVerified: Joi.boolean().optional(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

// ─── Bulk User Actions Validation ──────────────────
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
