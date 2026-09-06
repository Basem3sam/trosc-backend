const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Submission:
 *       type: object
 *       properties:
 *         student:
 *           type: string
 *           description: ObjectId reference to the submitting student
 *           example: 67123abc12ef4567890a1234
 *         file:
 *           type: string
 *           example: "https://drive.google.com/file/d/xyz"
 *         submittedAt:
 *           type: string
 *           format: date-time
 *         grade:
 *           type: number
 *           example: 85
 *     Assignment:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - instructor
 *         - deadline
 *       description: >
 *         Exactly one of `course` or `session` must be set — an assignment
 *         belongs to either a course or a standalone session, never both.
 *       properties:
 *         _id:
 *           type: string
 *           example: 6713b5ac12ef4567890a7777
 *         title:
 *           type: string
 *           example: "Build a REST API"
 *         description:
 *           type: string
 *           example: "Create a full CRUD API with Node.js"
 *         course:
 *           type: object
 *           nullable: true
 *           description: Populated course reference (mutually exclusive with session)
 *         session:
 *           type: object
 *           nullable: true
 *           description: Populated session reference (mutually exclusive with course)
 *         instructor:
 *           type: object
 *           description: Populated instructor reference
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *           example: ["https://drive.google.com/file/d/abc"]
 *         deadline:
 *           type: string
 *           format: date-time
 *           example: "2026-01-15T23:59:00.000Z"
 *         submissions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Submission'
 *         mySubmission:
 *           type: object
 *           nullable: true
 *           description: The requesting user's own submission, or null if not submitted (only present on the track-assignments list endpoint)
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const validateAttachments = require('../utils/validateAttachments');

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
  grade: {
    type: Number,
    min: [0, 'Grade cannot be negative'],
    max: [100, 'Grade cannot exceed 100'],
  },
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
    },
    session: {
      type: mongoose.Schema.ObjectId,
      ref: 'Session',
    },
    instructor: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'An assignment must have an instructor'],
    },
    attachments: {
      type: [String],
      validate: [
        validateAttachments,
        'Attachments must be valid URLs from trusted hosts',
      ],
    },
    deadline: {
      type: Date,
      required: [true, 'An assignment must have a deadline'],
    },
    submissions: [submissionSchema],
  },
  { timestamps: true },
);

assignmentSchema.pre('validate', function (next) {
  const hasCourse = !!this.course;
  const hasSession = !!this.session;

  if (hasCourse === hasSession) {
    return next(
      new Error(
        'An assignment must belong to exactly one of course or session (not both, not neither)',
      ),
    );
  }
  next();
});

assignmentSchema.index({ course: 1 });
assignmentSchema.index({ session: 1 });
assignmentSchema.index({ instructor: 1 });

const Assignment = mongoose.model('Assignment', assignmentSchema);
module.exports = Assignment;
