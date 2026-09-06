const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/, 'MongoDB ObjectId');

// :id — the parent course/track, depending on mount point
exports.resourceIdSchema = Joi.object({
  id: objectId.required().messages({
    'string.pattern.base': 'ID must be a valid MongoDB ID',
  }),
});

// :taskId — a specific weekly task
exports.taskIdSchema = Joi.object({
  taskId: objectId.required().messages({
    'string.pattern.base': 'Weekly task ID must be a valid MongoDB ID',
  }),
});

// :taskId + :itemId — a specific item within a specific weekly task
exports.taskItemIdSchema = Joi.object({
  taskId: objectId.required().messages({
    'string.pattern.base': 'Weekly task ID must be a valid MongoDB ID',
  }),
  itemId: objectId.required().messages({
    'string.pattern.base': 'Item ID must be a valid MongoDB ID',
  }),
});

const itemSchema = Joi.object({
  title: Joi.string().required().trim().messages({
    'string.empty': 'Item title is required',
  }),
  type: Joi.string()
    .valid('reading', 'quiz', 'video', 'assignment', 'other')
    .default('other'),
});

exports.createWeeklyTaskSchema = Joi.object({
  week: Joi.number().integer().min(1).required().messages({
    'number.base': 'Week must be a positive integer',
    'any.required': 'Week number is required',
  }),
  title: Joi.string().required().trim().messages({
    'string.empty': 'Title is required',
  }),
  items: Joi.array().items(itemSchema).min(1).required().messages({
    'array.min': 'At least one item is required',
    'any.required': 'Items are required',
  }),
});
