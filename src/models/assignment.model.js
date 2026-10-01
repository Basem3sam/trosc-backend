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
 *         feedback:
 *           type: string
 *           maxLength: 2000
 *           example: "Solid work overall — watch your edge cases in the last function."
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
 *           description: >
 *             Populated instructor reference — this is the field
 *             authorization checks are based on (who can currently edit,
 *             delete, or grade this assignment).
 *         createdBy:
 *           type: string
 *           nullable: true
 *           description: >
 *             ObjectId of whoever actually created this record. Pure
 *             historical attribution — it is NEVER used for
 *             authorization and does not change if `instructor` is later
 *             reassigned. May be null/absent on records created before
 *             this field existed and not yet backfilled (see
 *             scripts/backfillCreatedBy.js).
 *           example: 6713b5ac12ef4567890a1111
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
 *           description: The requesting user's own submission, or null if not submitted (only present on the assignment list endpoints)
 *         submissionCount:
 *           type: integer
 *           description: >
 *             Number of students who have submitted. Only present on the
 *             assignment list endpoints (tracks/courses/sessions
 *             `/:id/assignments`), and only for staff of that assignment
 *             (an admin, or the assignment's own instructor). Never sent to
 *             students or to instructors who don't manage the assignment.
 *           example: 3
 *         ungradedCount:
 *           type: integer
 *           description: >
 *             How many of those submissions have no grade yet. Same
 *             visibility as `submissionCount`.
 *           example: 2
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AssignmentCreate:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - deadline
 *       properties:
 *         title:
 *           type: string
 *           example: "Build a REST API"
 *         description:
 *           type: string
 *           example: "Create a full CRUD API with Node.js"
 *         deadline:
 *           type: string
 *           format: date-time
 *           example: "2026-01-15T23:59:00.000Z"
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *           description: Trusted-host URLs (Drive, GitHub, Cloudinary, etc.), max 10
 *     AssignmentUpdate:
 *       type: object
 *       description: At least one field must be provided.
 *       properties:
 *         title:
 *           type: string
 *           example: "Build a REST API (v2)"
 *         description:
 *           type: string
 *           example: "Updated requirements — add auth middleware"
 *         deadline:
 *           type: string
 *           format: date-time
 *           example: "2026-01-22T23:59:00.000Z"
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 */

const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const validateAttachments = require('../utils/validateAttachments');
const { trustedHostMessage } = require('../utils/trustedHostsMessage');

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
  feedback: {
    type: String,
    trim: true,
    maxlength: [2000, 'Feedback cannot exceed 2000 characters'],
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
    // Q6: pure historical attribution — "who actually created this record"
    // — and nothing else. `instructor` above is (today) also set to the
    // creator, and is the field `checkOwnership`/`policy.service.js`
    // actually authorize against; a later stage may let `instructor`
    // change hands (e.g. to reflect the course's current instructor)
    // without that meaning the original creator ever loses or gains
    // authorization based on this field. `createdBy` is never read by any
    // authorization check — see scripts/backfillCreatedBy.js for how
    // existing records (created before this field existed) get it filled
    // in. Not `required`: existing documents predate this field and are
    // backfilled, not migrated in place.
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    attachments: {
      type: [String],
      validate: [validateAttachments, trustedHostMessage('Each attachment')],
    },
    deadline: {
      type: Date,
      required: [true, 'An assignment must have a deadline'],
    },
    submissions: [submissionSchema],
  },
  { timestamps: true },
);

assignmentSchema.index({ course: 1 });
assignmentSchema.index({ session: 1 });
assignmentSchema.index({ instructor: 1 });
assignmentSchema.index({ createdBy: 1 });

assignmentSchema.pre('validate', function validateAssignment(next) {
  const hasCourse = !!this.course;
  const hasSession = !!this.session;
  if (hasCourse === hasSession) {
    return next(
      new AppError(
        'An assignment must belong to exactly one of course or session (not both, not neither)',
        400,
      ),
    );
  }
  next();
});

const Assignment = mongoose.model('Assignment', assignmentSchema);
module.exports = Assignment;
