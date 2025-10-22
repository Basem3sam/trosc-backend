/**
 * @swagger
 * components:
 *   schemas:
 *     Resource:
 *       type: object
 *       description: Learning resource attached to a session
 *       required:
 *         - title
 *         - url
 *       properties:
 *         title:
 *           type: string
 *           description: Title of the resource
 *           example: "JavaScript Arrays Cheat Sheet"
 *         url:
 *           type: string
 *           description: URL to access the resource
 *           format: uri
 *           example: "https://example.com/arrays-cheatsheet.pdf"
 *       example:
 *         title: "Practice Exercises PDF"
 *         url: "https://example.com/exercises.pdf"
 *
 *     Session:
 *       type: object
 *       description: Represents a learning session/class in the Trosc platform
 *       required:
 *         - title
 *         - instructor
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated MongoDB ObjectId
 *           example: "507f1f77bcf86cd799439031"
 *         title:
 *           type: string
 *           description: Title of the session
 *           example: "JavaScript Functions Deep Dive"
 *         description:
 *           type: string
 *           description: Detailed description of session content
 *           example: "Learn about function declarations, expressions, arrow functions, and closures"
 *         instructor:
 *           type: string
 *           description: User ID of the session instructor
 *           example: "507f1f77bcf86cd799439011"
 *         students:
 *           type: array
 *           description: List of enrolled students
 *           items:
 *             type: string
 *             example: "507f1f77bcf86cd799439012"
 *         track:
 *           type: string
 *           description: Parent track ID (optional for standalone sessions)
 *           example: "507f1f77bcf86cd799439021"
 *         isStandalone:
 *           type: boolean
 *           description: Whether session exists independently of a track
 *           default: false
 *           example: true
 *         duration:
 *           type: integer
 *           description: Session duration in minutes
 *           minimum: 1
 *           example: 90
 *         level:
 *           type: string
 *           description: Difficulty level of the session
 *           enum: [beginner, intermediate, advanced]
 *           default: "beginner"
 *           example: "intermediate"
 *         coverImage:
 *           type: string
 *           description: Session cover image URL
 *           example: "functions-session-cover.jpg"
 *         resources:
 *           type: array
 *           description: Learning resources for this session
 *           items:
 *             $ref: '#/components/schemas/Resource'
 *         published:
 *           type: boolean
 *           description: Whether session is publicly available
 *           default: false
 *           example: true
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: Scheduled start date/time for live sessions
 *           example: "2025-10-20T14:00:00.000Z"
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: Scheduled end date/time for live sessions
 *           example: "2025-10-20T15:30:00.000Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the session was created
 *           example: "2025-10-18T09:15:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the session was last updated
 *           example: "2025-10-19T16:45:00.000Z"
 *       example:
 *         _id: "507f1f77bcf86cd799439031"
 *         title: "JavaScript Functions Deep Dive"
 *         description: "Learn about function declarations, expressions, arrow functions, and closures"
 *         instructor:
 *           _id: "507f1f77bcf86cd799439011"
 *           name: "Basem Esam"
 *           email: "basem@example.com"
 *           role: "instructor"
 *         students: ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]
 *         track: "507f1f77bcf86cd799439021"
 *         isStandalone: false
 *         duration: 90
 *         level: "intermediate"
 *         coverImage: "functions-session-cover.jpg"
 *         resources:
 *           - title: "Practice Exercises PDF"
 *             url: "https://example.com/exercises.pdf"
 *           - title: "Video Recording"
 *             url: "https://example.com/recording.mp4"
 *         published: true
 *         startDate: "2025-10-20T14:00:00.000Z"
 *         endDate: "2025-10-20T15:30:00.000Z"
 *         createdAt: "2025-10-18T09:15:00.000Z"
 *         updatedAt: "2025-10-19T16:45:00.000Z"
 *
 *     SessionCreate:
 *       type: object
 *       description: Data required to create a new session
 *       required:
 *         - title
 *         - instructor
 *       properties:
 *         title:
 *           type: string
 *           example: "JavaScript Functions Deep Dive"
 *         description:
 *           type: string
 *           example: "Learn about function declarations, expressions, arrow functions, and closures"
 *         instructor:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         track:
 *           type: string
 *           example: "507f1f77bcf86cd799439021"
 *         isStandalone:
 *           type: boolean
 *           example: false
 *         duration:
 *           type: integer
 *           example: 90
 *         level:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *           example: "intermediate"
 *         coverImage:
 *           type: string
 *           example: "functions-session-cover.jpg"
 *         resources:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Resource'
 *         published:
 *           type: boolean
 *           example: true
 *         startDate:
 *           type: string
 *           format: date-time
 *           example: "2025-10-20T14:00:00.000Z"
 *         endDate:
 *           type: string
 *           format: date-time
 *           example: "2025-10-20T15:30:00.000Z"
 *
 *     SessionUpdate:
 *       type: object
 *       description: Data that can be updated for a session
 *       properties:
 *         title:
 *           type: string
 *           example: "Updated Session Title"
 *         description:
 *           type: string
 *           example: "Updated session description"
 *         instructor:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *         track:
 *           type: string
 *           example: "507f1f77bcf86cd799439022"
 *         isStandalone:
 *           type: boolean
 *           example: true
 *         duration:
 *           type: integer
 *           example: 120
 *         level:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *           example: "advanced"
 *         coverImage:
 *           type: string
 *           example: "new-cover-image.jpg"
 *         resources:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Resource'
 *         published:
 *           type: boolean
 *           example: false
 *         startDate:
 *           type: string
 *           format: date-time
 *           example: "2025-10-25T10:00:00.000Z"
 *         endDate:
 *           type: string
 *           format: date-time
 *           example: "2025-10-25T12:00:00.000Z"
 *
 *     SessionResponse:
 *       type: object
 *       description: Standard response format for session operations
 *       properties:
 *         status:
 *           type: string
 *           example: "success"
 *         data:
 *           type: object
 *           properties:
 *             session:
 *               $ref: '#/components/schemas/Session'
 *
 *     SessionsResponse:
 *       type: object
 *       description: Response format for multiple sessions
 *       properties:
 *         status:
 *           type: string
 *           example: "success"
 *         results:
 *           type: integer
 *           example: 8
 *         data:
 *           type: object
 *           properties:
 *             sessions:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Session'
 */

const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Resource title is required.'],
  },
  url: {
    type: String,
    required: [true, 'Resource URL is required.'],
  },
});

const sessionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'A session must have a title.'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    instructor: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A session must have an instructor.'],
    },
    students: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
    track: {
      type: mongoose.Schema.ObjectId,
      ref: 'Track',
      // This is optional, as 'isStandalone' handles the logic
    },
    isStandalone: {
      type: Boolean,
      default: false,
    },
    duration: {
      type: Number, // Duration in minutes
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    coverImage: {
      type: String,
    },
    resources: [resourceSchema],
    published: {
      type: Boolean,
      default: false,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
  },
  {
    timestamps: true, // Handles createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Middleware to automatically populate the instructor
sessionSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'instructor',
    select: 'name email role', // Select only the fields you need
  });
  next();
});

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
