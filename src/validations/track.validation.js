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
  instructor: objectId.optional(),
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
  instructor: objectId,
}).min(1);

exports.deleteTrackSchema = Joi.object({
  id: objectId.required(),
});

exports.manageSessionSchema = Joi.object({
  trackId: objectId.required(),
  sessionId: objectId.required(),
});
