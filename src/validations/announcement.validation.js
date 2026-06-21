const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/, 'MongoDB ObjectId');

exports.createAnnouncementSchema = Joi.object({
  title: Joi.string().required().trim().min(3).max(200).messages({
    'string.empty': 'Title is required',
    'string.min': 'Title must be at least 3 characters',
  }),
  message: Joi.string().required().trim().min(10).messages({
    'string.empty': 'Message is required',
    'string.min': 'Message must be at least 10 characters',
  }),
  audience: Joi.string().valid('all', 'track', 'course').default('all'),
  targetTrack: objectId.optional(),
  targetCourse: objectId.optional(),
  attachments: Joi.array().items(Joi.string()).optional(),
  isPinned: Joi.boolean().default(false),
});

exports.updateAnnouncementSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).optional(),
  message: Joi.string().trim().min(10).optional(),
  audience: Joi.string().valid('all', 'track', 'course').optional(),
  targetTrack: objectId.optional(),
  targetCourse: objectId.optional(),
  attachments: Joi.array().items(Joi.string()).optional(),
  isPinned: Joi.boolean().optional(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

exports.announcementIdSchema = Joi.object({
  id: objectId.required().messages({
    'string.pattern.base': 'Announcement ID must be a valid MongoDB ID',
  }),
});
