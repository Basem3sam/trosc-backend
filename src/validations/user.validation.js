const Joi = require('joi');

// ─── Signup Validation ─────────────────────────────
exports.signupSchema = Joi.object({
  name: Joi.string().min(3).max(30).required().messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 3 characters long',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email address',
    'string.empty': 'Email is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters',
  }),
  passwordConfirm: Joi.any().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
  }),
});

// ─── Login Validation ──────────────────────────────
exports.loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// ─── Update Profile Validation ─────────────────────
exports.updateMeSchema = Joi.object({
  name: Joi.string().min(3).max(30),
  email: Joi.string().email(),
  photo: Joi.string(),
}).min(1); // at least one field must be provided

// ─── Update Password Validation ────────────────────
exports.updatePasswordSchema = Joi.object({
  passwordCurrent: Joi.string().required(),
  password: Joi.string().min(8).required(),
  passwordConfirm: Joi.any().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
  }),
});

// ─── Forgot Password Validation ────────────────────
exports.forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

// ─── Reset Password Validation ─────────────────────
exports.resetPasswordSchema = Joi.object({
  password: Joi.string().min(8).required(),
  passwordConfirm: Joi.any().valid(Joi.ref('password')).required(),
});
