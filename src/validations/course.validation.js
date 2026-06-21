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

// ✅ Instructor is auto-assigned from req.user.id in controller, not accepted in body
exports.createCourseSchema = Joi.object({
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
  track: objectId,
  level: Joi.string().valid('beginner', 'intermediate', 'advanced'),
  coverImage: photoValidation,
  published: Joi.boolean(),
  prerequisites: Joi.array().items(objectId),
  duration: Joi.number().integer().min(1),
  syllabus: Joi.array().items(syllabusItemValidation),
  attachments: attachmentValidation,
  // instructor: REMOVED - cannot change instructor via update
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
