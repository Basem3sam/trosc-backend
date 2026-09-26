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
  // Admin-only in practice: the controller strips this for non-admins
  // before it ever reaches this schema/the service. See #2.1 — an admin
  // can assign a track to any user whose role is instructor or admin;
  // that role check itself happens in track.service.js (needs a DB
  // lookup, which Joi can't do).
  instructor: objectId.optional().messages({
    'string.pattern.base': 'Instructor must be a valid MongoDB ID',
  }),
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
  // Admin-only — see the matching comment on createTrackSchema above.
  instructor: objectId.optional().messages({
    'string.pattern.base': 'Instructor must be a valid MongoDB ID',
  }),
  // M2: courses/sessions are intentionally NOT accepted here. Setting
  // them directly via track.set() would overwrite Track.courses/sessions
  // without updating the corresponding Course.track / Session.tracks
  // side, desyncing the two-way relationship that
  // addCourseToTrack/removeCourseFromTrack maintain. Use the dedicated
  // /:trackId/courses/:courseId and /:trackId/sessions/:sessionId
  // endpoints to add or remove membership instead. The controller
  // already stripped these keys before this schema ran; removing them
  // here too keeps the documented API contract honest about what this
  // route actually accepts.
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
