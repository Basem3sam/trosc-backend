const Joi = require('joi');
const photoValidation = require('../utils/photoValidation');
const attachmentValidation = require('../utils/attachmentValidation');

// Helper for MongoDB ObjectId validation
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/, 'MongoDB ObjectId');

const syllabusItemValidation = Joi.object({
  title: Joi.string().required().messages({
    'string.empty': 'Syllabus item title is required',
    'any.required': 'Syllabus item title is required',
  }),
  description: Joi.string().trim().allow('').optional(),
});

// Instructor is auto-assigned from req.user.id in the controller. Round-2
// #2.1: an ADMIN may also set `instructor` (a user with role instructor or
// admin - checked in course.service.js, which needs a DB lookup); the
// controller drops it for everyone else, the same way POST /tracks does.
exports.createCourseSchema = Joi.object({
  instructor: objectId.messages({
    'string.pattern.base': 'Instructor must be a valid MongoDB ID',
  }),
  title: Joi.string().required().min(3).max(100).messages({
    'string.empty': 'Course title is required',
    'string.min': 'Course title must be at least 3 characters',
    'string.max': 'Course title cannot exceed 100 characters',
  }),
  description: Joi.string().required().min(10).messages({
    'string.empty': 'Course description is required',
    'string.min': 'Description must be at least 10 characters',
  }),
  track: objectId.messages({
    'string.pattern.base': 'Track must be a valid MongoDB ID',
  }),
  level: Joi.string().valid('beginner', 'intermediate', 'advanced'),
  access: Joi.string().valid('public', 'track-only', 'private').messages({
    'any.only': 'Access must be one of: public, track-only, private',
  }),
  coverImage: photoValidation,
  published: Joi.boolean(),
  prerequisites: Joi.array().items(objectId),
  duration: Joi.number().integer().min(1).messages({
    'number.min': 'Duration must be at least 1 hour',
  }),
  syllabus: Joi.array().items(syllabusItemValidation),
  attachments: attachmentValidation,
});

exports.getCourseSchema = Joi.object({
  id: objectId.required().messages({
    'string.pattern.base': 'Course ID must be a valid MongoDB ID',
  }),
});

exports.updateCourseSchema = Joi.object({
  title: Joi.string().min(3).max(100),
  description: Joi.string().min(10),
  // .allow(null) supports explicitly detaching a course from its track
  // (see course.service.js#updateCourse and #3.3) — omitting the field
  // entirely leaves the track relationship untouched, same as before.
  track: objectId.allow(null),
  level: Joi.string().valid('beginner', 'intermediate', 'advanced'),
  access: Joi.string().valid('public', 'track-only', 'private'),
  coverImage: photoValidation,
  published: Joi.boolean(),
  prerequisites: Joi.array().items(objectId),
  duration: Joi.number().integer().min(1),
  syllabus: Joi.array().items(syllabusItemValidation),
  attachments: attachmentValidation,
  // Admin-only (round-2 #2.1): reassigns the course immediately. The
  // controller drops it for non-admins; the role check is in the service.
  instructor: objectId.messages({
    'string.pattern.base': 'Instructor must be a valid MongoDB ID',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

exports.deleteCourseSchema = Joi.object({
  id: objectId.required().messages({
    'string.pattern.base': 'Course ID must be a valid MongoDB ID',
  }),
});

exports.manageSessionSchema = Joi.object({
  courseId: objectId.required().messages({
    'string.pattern.base': 'Course ID must be a valid MongoDB ID',
  }),
  sessionId: objectId.required().messages({
    'string.pattern.base': 'Session ID must be a valid MongoDB ID',
  }),
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
