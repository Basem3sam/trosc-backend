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
reviewSchema.index({ course: 1, user: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
