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
 *         url:
 *           type: string
 *           description: Primary content link (YouTube, Drive, Zoom, etc.)
 *           format: uri
 *           example: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
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
 *         tracks:
 *           type: array
 *           description: Parent track IDs this session belongs to
 *           items:
 *             type: string
 *           example: ["507f1f77bcf86cd799439021"]
 *         course:
 *           type: string
 *           description:  Parent course ObjectId (if any)
 *           example: "507f1f77bcf86cd799439041"
 *         access:
 *           type: string
 *           enum: [public, track-only, private]
 *           default: track-only
 *           example: track-only
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
 *         tracks:
 *           type: array
 *           items:
 *             type: string
 *           example: ["507f1f77bcf86cd799439021"]
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
 *       properties:
 *         title:
 *           type: string
 *           example: "JavaScript Functions Deep Dive"
 *         description:
 *           type: string
 *           example: "Learn about function declarations, expressions, arrow functions, and closures"
 *         url:
 *           type: string
 *           format: uri
 *           example: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
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
 *         url:
 *           type: string
 *           format: uri
 *           example: "https://drive.google.com/file/d/abc123"
 *         instructor:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *         tracks:
 *           type: array
 *           items:
 *             type: string
 *           example: ["507f1f77bcf86cd799439021"]
 *         access:
 *           type: string
 *           enum: [public, track-only, private]
 *           example: public
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
 *       description: Response format for a single session
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
 *         total:
 *           type: integer
 *           example: 50
 *         data:
 *           type: object
 *           properties:
 *             sessions:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Session'
 */

const mongoose = require('mongoose');
const validator = require('validator');

const resourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Resource title is required.'],
  },
  url: {
    type: String,
    required: [true, 'Resource URL is required.'],
    validate: {
      validator: function (v) {
        if (!v) return true;
        try {
          const parsed = new URL(v);
          const allowedHosts = [
            'drive.google.com',
            'docs.google.com',
            'youtube.com',
            'youtu.be',
            'github.com',
            'raw.githubusercontent.com',
            'res.cloudinary.com',
            'i.imgur.com',
            'cdn.discordapp.com',
          ];
          return (
            allowedHosts.some((h) => parsed.hostname.endsWith(h)) &&
            parsed.protocol === 'https:'
          );
        } catch {
          return false;
        }
      },
      message:
        'Resource URL must be from a trusted host (YouTube, Drive, GitHub, Cloudinary, etc.)',
    },
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
    url: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          const youtubeRegex =
            /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i;
          const driveRegex =
            /^(https?:\/\/)?(drive\.google\.com|docs\.google\.com)\/.+/i;
          return (
            youtubeRegex.test(v) ||
            driveRegex.test(v) ||
            validator.isURL(v, { require_protocol: true })
          );
        },
        message:
          'Session URL must be a valid YouTube, Google Drive, or other valid URL',
      },
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
    tracks: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Track',
      },
    ],
    course: {
      type: mongoose.Schema.ObjectId,
      ref: 'Course',
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
      default: 'https://placehold.co/800x400?text=Trosc+Session',
      validate: {
        validator: function (v) {
          if (!v || v === 'https://placehold.co/800x400?text=Trosc+Session')
            return true;
          if (validator.isURL(v, { require_protocol: true })) return true;
          return /^(?!.*[\/\\])[a-zA-Z0-9_\-]+\.(jpg|jpeg|png|webp)$/i.test(v);
        },
        message: 'Cover image must be a valid URL or image filename',
      },
    },
    resources: [resourceSchema],
    published: {
      type: Boolean,
      default: false,
    },
    access: {
      type: String,
      enum: ['public', 'track-only', 'private'],
      default: 'track-only',
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

// For filtering by track
sessionSchema.index({ tracks: 1 });
// For filtering by course
sessionSchema.index({ course: 1 });
// For filtering by instructor
sessionSchema.index({ instructor: 1 });
// For published + level filtering
sessionSchema.index({ published: 1, level: 1 });

sessionSchema.pre('save', function (next) {
  // Auto-set isStandalone based on relationships
  this.isStandalone = !this.tracks?.length && !this.course;
  next();
});

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
