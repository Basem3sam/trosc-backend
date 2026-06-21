const Joi = require('joi');
const photoValidation = require('../utils/photoValidation');

// Helper for MongoDB ObjectId validation
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/, 'MongoDB ObjectId');

// ✅ SIMPLIFIED - Direct Joi schemas (no body/params wrapper)
exports.createTrackSchema = Joi.object({
  title: Joi.string().required().min(3).max(100),
  description: Joi.string().required().min(10),
  level: Joi.string().valid('beginner', 'intermediate', 'advanced', 'all'),
  coverImage: photoValidation,
  published: Joi.boolean(),
  // instructor: REMOVED - auto-assigned by controller, never from client
});

exports.getTrackSchema = Joi.object({
  id: objectId.required(),
});

exports.updateTrackSchema = Joi.object({
  title: Joi.string().min(3).max(100),
  description: Joi.string().min(10),
  level: Joi.string().valid('beginner', 'intermediate', 'advanced', 'all'),
  coverImage: photoValidation,
  published: Joi.boolean(),
  courses: Joi.array().items(objectId),
  sessions: Joi.array().items(objectId),
}).min(1);

exports.deleteTrackSchema = Joi.object({
  id: objectId.required(),
});

exports.manageCourseSchema = Joi.object({
  trackId: objectId.required(),
  courseId: objectId.required(),
});

exports.manageSessionSchema = Joi.object({
  trackId: objectId.required(),
  sessionId: objectId.required(),
});

exports.addStudentSchema = Joi.object({
  studentId: objectId.required().messages({
    'string.pattern.base': 'Student ID must be a valid MongoDB ID',
    'any.required': 'Student ID is required',
  }),
});

exports.studentIdSchema = Joi.object({
  studentId: objectId.required().messages({
    'string.pattern.base': 'Student ID must be a valid MongoDB ID',
  }),
});
