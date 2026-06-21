/**
 * @swagger
 * components:
 *   schemas:
 *     Review:
 *       type: object
 *       required:
 *         - user
 *         - content
 *       properties:
 *         _id:
 *           type: string
 *           example: 6713b5ac12ef4567890a8888
 *         user:
 *           type: string
 *           description: ObjectId reference to the reviewer
 *           example: 67123abc12ef4567890a1234
 *         course:
 *           type: string
 *           description: ObjectId reference to the reviewed course (optional)
 *           example: 67123abc12ef4567890a5678
 *         assignment:
 *           type: string
 *           description: ObjectId reference to the reviewed assignment (optional)
 *           example: 67123abc12ef4567890a9999
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           example: 4
 *         content:
 *           type: string
 *           description: Review text content
 *           example: "Great course, very informative!"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2025-10-18T14:30:00.000Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: 2025-10-18T15:00:00.000Z
 */

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    course: {
      type: mongoose.Schema.ObjectId,
      ref: 'Course',
    },
    assignment: {
      type: mongoose.Schema.ObjectId,
      ref: 'Assignment',
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    content: {
      type: String,
      required: [true, 'A review must have content'],
      trim: true,
    },
  },
  { timestamps: true },
);

// Optional: one review per user per course
reviewSchema.index(
  { course: 1, user: 1 },
  { unique: true, partialFilterExpression: { course: { $exists: true } } },
);

reviewSchema.index(
  { assignment: 1, user: 1 },
  { unique: true, partialFilterExpression: { assignment: { $exists: true } } },
);

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
