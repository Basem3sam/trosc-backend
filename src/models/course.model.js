/**
 * @swagger
 * components:
 *   schemas:
 *     Course:
 *       type: object
 *       description: Represents a course within a track in the Trosc platform
 *       required:
 *         - title
 *         - description
 *         - instructor
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated MongoDB ObjectId
 *           example: "507f1f77bcf86cd799439041"
 *         title:
 *           type: string
 *           description: Unique title of the course
 *           example: "Advanced React Patterns"
 *           minLength: 3
 *           maxLength: 100
 *         description:
 *           type: string
 *           description: Detailed description of the course content
 *           example: "Master advanced React patterns including HOCs, render props, and custom hooks"
 *         track:
 *           type: string
 *           description: Parent track ID this course belongs to
 *           example: "507f1f77bcf86cd799439021"
 *         instructor:
 *           type: string
 *           description: Reference to the User who instructs this course
 *           example: "507f1f77bcf86cd799439011"
 *         students:
 *           type: array
 *           description: List of enrolled students
 *           items:
 *             type: string
 *             example: "507f1f77bcf86cd799439012"
 *         sessions:
 *           type: array
 *           description: List of sessions belonging to this course
 *           items:
 *             type: string
 *             example: "507f1f77bcf86cd799439031"
 *         level:
 *           type: string
 *           description: Difficulty level of the course
 *           enum: [beginner, intermediate, advanced]
 *           default: "beginner"
 *           example: "intermediate"
 *         coverImage:
 *           type: string
 *           description: URL or filename for the course cover image
 *           default: "default-course.jpg"
 *           example: "react-patterns-cover.jpg"
 *         published:
 *           type: boolean
 *           description: Whether the course is publicly available
 *           default: false
 *           example: true
 *         access:
 *           type: string
 *           enum: [public, track-only, private]
 *           default: track-only
 *           example: track-only
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *           description: Trusted-host URLs (Drive, GitHub, Cloudinary, etc.)
 *         prerequisites:
 *           type: array
 *           description: List of prerequisite course IDs
 *           items:
 *             type: string
 *             example: "507f1f77bcf86cd799439042"
 *         duration:
 *           type: integer
 *           description: Total estimated duration in hours
 *           example: 12
 *         syllabus:
 *           type: array
 *           description: Course syllabus items
 *           items:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Week 1: Higher-Order Components"
 *               description:
 *                 type: string
 *                 example: "Understanding HOC patterns and composition"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-10-18T10:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-10-18T14:45:00.000Z"
 *       example:
 *         _id: "507f1f77bcf86cd799439041"
 *         title: "Advanced React Patterns"
 *         description: "Master advanced React patterns including HOCs, render props, and custom hooks"
 *         track: "507f1f77bcf86cd799439021"
 *         instructor:
 *           _id: "507f1f77bcf86cd799439011"
 *           name: "Basem Esam"
 *           email: "basem@example.com"
 *           role: "instructor"
 *         students: ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]
 *         sessions: ["507f1f77bcf86cd799439031", "507f1f77bcf86cd799439032"]
 *         level: "intermediate"
 *         coverImage: "react-patterns-cover.jpg"
 *         published: true
 *         prerequisites: ["507f1f77bcf86cd799439042"]
 *         duration: 12
 *         syllabus:
 *           - title: "Week 1: Higher-Order Components"
 *             description: "Understanding HOC patterns and composition"
 *           - title: "Week 2: Render Props"
 *             description: "Mastering the render props pattern"
 *         createdAt: "2025-10-18T10:30:00.000Z"
 *         updatedAt: "2025-10-18T14:45:00.000Z"
 *
 *     CourseCreate:
 *       type: object
 *       description: Data required to create a new course
 *       required:
 *         - title
 *         - description
 *       properties:
 *         title:
 *           type: string
 *           example: "Advanced React Patterns"
 *         description:
 *           type: string
 *           example: "Master advanced React patterns including HOCs, render props, and custom hooks"
 *         track:
 *           type: string
 *           example: "507f1f77bcf86cd799439021"
 *         level:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *           example: "intermediate"
 *         coverImage:
 *           type: string
 *           example: "react-patterns-cover.jpg"
 *         published:
 *           type: boolean
 *           example: true
 *         access:
 *           type: string
 *           enum: [public, track-only, private]
 *           example: track-only
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *         prerequisites:
 *           type: array
 *           items:
 *             type: string
 *           example: ["507f1f77bcf86cd799439042"]
 *         duration:
 *           type: integer
 *           example: 12
 *         syllabus:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *           example:
 *             - title: "Week 1: Higher-Order Components"
 *               description: "Understanding HOC patterns"
 *
 *     CourseUpdate:
 *       type: object
 *       description: Data that can be updated for a course
 *       properties:
 *         title:
 *           type: string
 *           example: "Updated Course Title"
 *         description:
 *           type: string
 *           example: "Updated course description"
 *         track:
 *           type: string
 *           example: "507f1f77bcf86cd799439022"
 *         level:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *           example: "advanced"
 *         coverImage:
 *           type: string
 *           example: "new-cover-image.jpg"
 *         published:
 *           type: boolean
 *           example: false
 *         access:
 *           type: string
 *           enum: [public, track-only, private]
 *           default: track-only
 *           example: track-only
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *           description: Trusted-host URLs (Drive, GitHub, Cloudinary, etc.)
 *         prerequisites:
 *           type: array
 *           items:
 *             type: string
 *           example: ["507f1f77bcf86cd799439043"]
 *         duration:
 *           type: integer
 *           example: 15
 *         syllabus:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *
 *     CourseResponse:
 *       type: object
 *       description: Standard response format for course operations
 *       properties:
 *         status:
 *           type: string
 *           example: "success"
 *         data:
 *           type: object
 *           properties:
 *             course:
 *               $ref: '#/components/schemas/Course'
 *
 *     CoursesResponse:
 *       type: object
 *       description: Response format for multiple courses
 *       properties:
 *         status:
 *           type: string
 *           example: "success"
 *         results:
 *           type: integer
 *           example: 5
 *         total:
 *           type: integer
 *           example: 20
 *         data:
 *           type: object
 *           properties:
 *             courses:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 */

const mongoose = require('mongoose');
const validator = require('validator');
const validateAttachments = require('../utils/validateAttachments');

const syllabusItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Syllabus item must have a title'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { _id: true },
);

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'A course must have a title'],
      unique: true,
      trim: true,
      minlength: [3, 'Course title must be at least 3 characters long'],
      maxlength: [100, 'Course title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'A course must have a description'],
      trim: true,
    },
    track: {
      type: mongoose.Schema.ObjectId,
      ref: 'Track',
    },
    instructor: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A course must have an instructor'],
    },
    students: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
    sessions: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Session',
      },
    ],
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    coverImage: {
      type: String,
      default: 'https://placehold.co/800x400?text=Trosc+Course',
      validate: {
        validator: function (v) {
          if (!v || v === 'https://placehold.co/800x400?text=Trosc+Course')
            return true;
          if (validator.isURL(v, { require_protocol: true })) return true;
          return /^(?!.*[\/\\])[a-zA-Z0-9_\-]+\.(jpg|jpeg|png|webp)$/i.test(v);
        },
        message: 'Cover image must be a valid URL or image filename',
      },
    },
    published: {
      type: Boolean,
      default: false,
    },
    access: {
      type: String,
      enum: ['public', 'track-only', 'private'],
      default: 'track-only',
    },
    prerequisites: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Course',
      },
    ],
    duration: {
      type: Number, // Duration in hours
      min: [1, 'Duration must be at least 1 hour'],
    },
    syllabus: [syllabusItemSchema],
    attachments: {
      type: [String],
      validate: [
        validateAttachments,
        'Course attachments must be valid URLs from trusted hosts',
      ],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for enrolled students count
courseSchema.virtual('studentCount').get(function () {
  return this.students ? this.students.length : 0;
});

// Virtual for session count
courseSchema.virtual('sessionCount').get(function () {
  return this.sessions ? this.sessions.length : 0;
});

// Indexes for performance
courseSchema.index({ instructor: 1 });
courseSchema.index({ students: 1 });
courseSchema.index({ track: 1 });
courseSchema.index({ published: 1, level: 1 });
courseSchema.index({ title: 'text', description: 'text' });

// Populate instructor and track on every query
courseSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'instructor',
    select: 'name email role photo',
  }).populate({
    path: 'track',
    select: 'title description',
  });
  next();
});

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;
