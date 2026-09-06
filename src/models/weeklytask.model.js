/**
 * @swagger
 * components:
 *   schemas:
 *     WeeklyTaskItem:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         _id:
 *           type: string
 *           example: 6713b5ac12ef4567890aaaa1
 *         title:
 *           type: string
 *           example: "Read Chapter 1"
 *         type:
 *           type: string
 *           enum: [reading, quiz, video, assignment, other]
 *           default: other
 *           example: reading
 *         done:
 *           type: boolean
 *           description: Whether the requesting user has completed this item (computed per-request, not stored on the item itself)
 *           example: false
 *     WeeklyTask:
 *       type: object
 *       required:
 *         - course
 *         - week
 *         - title
 *       properties:
 *         _id:
 *           type: string
 *           example: 6713b5ac12ef4567890a6666
 *         course:
 *           type: string
 *           description: ObjectId reference to the parent course
 *           example: 67123abc12ef4567890a5678
 *         instructor:
 *           type: string
 *           description: ObjectId reference to the owning instructor (copied from the course at creation time)
 *           example: 67123abc12ef4567890a1234
 *         week:
 *           type: integer
 *           minimum: 1
 *           example: 1
 *         title:
 *           type: string
 *           example: "Week 1: Networking Basics"
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/WeeklyTaskItem'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'A weekly task item must have a title'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['reading', 'quiz', 'video', 'assignment', 'other'],
    default: 'other',
  },
});

// Tracks which students have completed which items. Kept as its own
// embedded array (mirrors Assignment.submissions) rather than a boolean
// on the item itself, since completion is per-student, not global.
const completionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  item: {
    type: mongoose.Schema.ObjectId,
    required: true,
  },
  completedAt: {
    type: Date,
    default: Date.now,
  },
});

const weeklyTaskSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.ObjectId,
      ref: 'Course',
      required: [true, 'A weekly task must belong to a course'],
    },
    instructor: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A weekly task must have an owning instructor'],
    },
    week: {
      type: Number,
      required: [true, 'A weekly task must have a week number'],
      min: [1, 'Week number must be at least 1'],
    },
    title: {
      type: String,
      required: [true, 'A weekly task must have a title'],
      trim: true,
    },
    items: [itemSchema],
    completions: [completionSchema],
  },
  { timestamps: true },
);

// One week-bucket per course per week number
weeklyTaskSchema.index({ course: 1, week: 1 }, { unique: true });
weeklyTaskSchema.index({ instructor: 1 });

const WeeklyTask = mongoose.model('WeeklyTask', weeklyTaskSchema);
module.exports = WeeklyTask;
