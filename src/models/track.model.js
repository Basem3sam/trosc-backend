/**
 * @swagger
 * components:
 *   schemas:
 *     Track:
 *       type: object
 *       description: Represents a learning track/course in the Trosc platform
 *       required:
 *         - title
 *         - description
 *         - instructor
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated MongoDB ObjectId
 *           example: "507f1f77bcf86cd799439021"
 *         title:
 *           type: string
 *           description: Unique title of the track
 *           example: "Full Stack Web Development"
 *           minLength: 3
 *           maxLength: 100
 *         description:
 *           type: string
 *           description: Detailed description of the track content and objectives
 *           example: "Learn modern web development with JavaScript, React, Node.js and MongoDB"
 *         instructor:
 *           type: string
 *           description: Reference to the User who instructs this track
 *           example: "507f1f77bcf86cd799439011"
 *         sessions:
 *           type: array
 *           description: List of sessions belonging to this track
 *           items:
 *             type: string
 *             example: "507f1f77bcf86cd799439031"
 *         level:
 *           type: string
 *           description: Difficulty level suitable for this track
 *           enum: [beginner, intermediate, advanced, all]
 *           default: "all"
 *           example: "beginner"
 *         coverImage:
 *           type: string
 *           description: URL or filename for the track cover image
 *           default: "default-track.jpg"
 *           example: "web-dev-cover.jpg"
 *         published:
 *           type: boolean
 *           description: Whether the track is publicly available
 *           default: false
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the track was created
 *           example: "2025-10-18T10:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the track was last updated
 *           example: "2025-10-18T14:45:00.000Z"
 *       example:
 *         _id: "507f1f77bcf86cd799439021"
 *         title: "Full Stack Web Development"
 *         description: "Learn modern web development with JavaScript, React, Node.js and MongoDB"
 *         instructor:
 *           _id: "507f1f77bcf86cd799439011"
 *           name: "Basem Esam"
 *           email: "basem@example.com"
 *           role: "instructor"
 *           photo: "instructor-profile.jpg"
 *         sessions: ["507f1f77bcf86cd799439031", "507f1f77bcf86cd799439032"]
 *         level: "beginner"
 *         coverImage: "web-dev-cover.jpg"
 *         published: true
 *         createdAt: "2025-10-18T10:30:00.000Z"
 *         updatedAt: "2025-10-18T14:45:00.000Z"
 *
 *     TrackCreate:
 *       type: object
 *       description: Data required to create a new track
 *       required:
 *         - title
 *         - description
 *       properties:
 *         title:
 *           type: string
 *           example: "Full Stack Web Development"
 *         description:
 *           type: string
 *           example: "Learn modern web development with JavaScript, React, Node.js and MongoDB"
 *         level:
 *           type: string
 *           enum: [beginner, intermediate, advanced, all]
 *           example: "beginner"
 *         coverImage:
 *           type: string
 *           example: "web-dev-cover.jpg"
 *         published:
 *           type: boolean
 *           example: true
 *
 *     TrackUpdate:
 *       type: object
 *       description: Data that can be updated for a track
 *       properties:
 *         title:
 *           type: string
 *           example: "Updated Track Title"
 *         description:
 *           type: string
 *           example: "Updated track description"
 *         instructor:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *         level:
 *           type: string
 *           enum: [beginner, intermediate, advanced, all]
 *           example: "intermediate"
 *         coverImage:
 *           type: string
 *           example: "new-cover-image.jpg"
 *         published:
 *           type: boolean
 *           example: false
 *
 *     TrackResponse:
 *       type: object
 *       description: Standard response format for track operations
 *       properties:
 *         status:
 *           type: string
 *           example: "success"
 *         data:
 *           type: object
 *           properties:
 *             track:
 *               $ref: '#/components/schemas/Track'
 *
 *     TracksResponse:
 *       type: object
 *       description: Response format for multiple tracks
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
 *             tracks:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Track'
 *     TrackAnalytics:
 *       type: object
 *       properties:
 *         totalStudents:
 *           type: integer
 *           example: 42
 *         totalSessions:
 *           type: integer
 *           example: 12
 *         enrollmentRate:
 *           type: integer
 *           example: 42
 *         completionRate:
 *           type: integer
 *           example: 0
 *         averageEngagement:
 *           type: integer
 *           example: 0
 */

const mongoose = require('mongoose');
const validator = require('validator');
const AppError = require('../utils/AppError');

const trackSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'A track must have a title.'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'A track must have a description.'],
      trim: true,
    },
    instructor: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A track must have an instructor.'],
    },
    courses: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Course',
      },
    ],
    sessions: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Session',
      },
    ],
    students: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'all'],
      default: 'all',
    },
    coverImage: {
      type: String,
      default: 'https://placehold.co/800x400?text=Trosc+Track',
      validate: {
        validator: function (v) {
          if (!v || v === 'https://placehold.co/800x400?text=Trosc+Track')
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
    // Virtual populate for student count or other stats can be added here
  },
  {
    timestamps: true, // Handles createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for enrolled students count
trackSchema.virtual('studentCount').get(function () {
  return this.students ? this.students.length : 0;
});

// Virtual for session count
trackSchema.virtual('sessionCount').get(function () {
  return this.sessions ? this.sessions.length : 0;
});

// Virtual for course count
trackSchema.virtual('courseCount').get(function () {
  return this.courses ? this.courses.length : 0;
});

// Virtual: total content count (courses + direct sessions)
trackSchema.virtual('contentCount').get(function () {
  const courseCount = this.courses ? this.courses.length : 0;
  const sessionCount = this.sessions ? this.sessions.length : 0;
  return {
    courses: courseCount,
    sessions: sessionCount,
    total: courseCount + sessionCount,
  };
});

trackSchema.index({ instructor: 1 });
trackSchema.index({ published: 1, level: 1 });
trackSchema.index({ title: 'text', description: 'text' }); // For search

// Populate instructor info on every query
trackSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'instructor',
    select: 'name email role photo', // Customize fields as needed
  });
  next();
});

const Track = mongoose.model('Track', trackSchema);

module.exports = Track;
