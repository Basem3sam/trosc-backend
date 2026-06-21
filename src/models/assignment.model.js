const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  file: String,
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  grade: Number,
});

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'An assignment must have a title'],
    },
    description: {
      type: String,
      required: [true, 'An assignment must have a description'],
    },
    course: {
      type: mongoose.Schema.ObjectId,
      ref: 'Course',
      required: [true, 'An assignment must belong to a course'],
    },
    instructor: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'An assignment must have an instructor'],
    },
    attachments: {
      type: [String],
      validate: {
        validator: function (arr) {
          if (!arr || !arr.length) return true;
          return arr.every((url) => {
            try {
              const parsed = new URL(url);
              const allowedHosts = [
                'drive.google.com',
                'docs.google.com',
                'dropbox.com',
                'github.com',
                'raw.githubusercontent.com',
                'res.cloudinary.com',
                'i.imgur.com',
              ];
              return (
                allowedHosts.some((h) => parsed.hostname.endsWith(h)) ||
                parsed.protocol === 'https:'
              );
            } catch {
              return false;
            }
          });
        },
        message: 'Attachments must be valid URLs from trusted hosts',
      },
    },
    deadline: {
      type: Date,
      required: [true, 'An assignment must have a deadline'],
    },
    submissions: [submissionSchema],
  },
  { timestamps: true },
);

const Assignment = mongoose.model('Assignment', assignmentSchema);
module.exports = Assignment;
