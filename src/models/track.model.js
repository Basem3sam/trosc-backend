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
 *           description: ObjectId reference to the lead instructor. Returned as a populated `{ _id, name, photo }` object in GET responses (no email/role).
 *           example: "507f1f77bcf86cd799439011"
 *         instructors:
 *           type: array
 *           description: >
 *             Co-instructors (round-2 #2.2). `instructor` stays the lead.
 *             Returned populated as `{ _id, name, photo }` (never email or
 *             role) on every GET /tracks* response. Admin-settable only.
 *           items:
 *             type: string
 *             example: "507f1f77bcf86cd799439014"
 *         courses:
 *           type: array
 *           description: List of courses belonging to this track
 *           items:
 *             type: string
 *             example: "507f1f77bcf86cd799439041"
 *         students:
 *           type: array
 *           description: >
 *             List of enrolled students. Only present in the API response
 *             for the track's current instructor or an admin, or (with
 *             name/email/photo populated) for the requester themself when
 *             they're enrolled. Everyone else gets `studentCount` +
 *             `isEnrolled` instead — this field is simply absent from
 *             their response, not emptied.
 *           items:
 *             type: string
 *             example: "507f1f77bcf86cd799439012"
 *         pendingStudents:
 *           type: array
 *           items: { type: string }
 *           description: >
 *             Students awaiting enrollment approval. Only present for the
 *             track's current instructor or an admin — being merely
 *             enrolled doesn't qualify. Everyone else gets `isPending`
 *             (their own status) instead.
 *         pendingLeaves:
 *           type: array
 *           items: { type: string }
 *           description: >
 *             Students awaiting leave approval. Same staff-only rule as
 *             `pendingStudents`; everyone else gets `isPendingLeave`.
 *         studentCount:
 *           type: integer
 *           description: Number of enrolled students (always present, for everyone)
 *           example: 42
 *         isEnrolled:
 *           type: boolean
 *           description: Whether the requesting user is enrolled in this track (always present when authenticated)
 *         isPending:
 *           type: boolean
 *           description: Whether the requesting user has a pending enrollment application (only present when `pendingStudents` is absent from the response)
 *         isPendingLeave:
 *           type: boolean
 *           description: Whether the requesting user has a pending leave request (only present when `pendingLeaves` is absent from the response)
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
 *           photo: "instructor-profile.jpg"
 *         instructors:
 *           - _id: "507f1f77bcf86cd799439014"
 *             name: "Sara Ali"
 *             photo: "sara.jpg"
 *         courses: ["507f1f77bcf86cd799439041", "507f1f77bcf86cd799439042"]
 *         students: ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]
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
 *         instructor:
 *           type: string
 *           description: Admin only. Assigns a specific instructor (must have role instructor or admin). Ignored/overwritten with the requester's own id for non-admins.
 *           example: "507f1f77bcf86cd799439011"
 *         instructors:
 *           type: array
 *           description: Admin only (silently dropped for non-admins, like `instructor`). Co-instructor ids; each must be a user with role instructor or admin (400 otherwise). Duplicates and the lead's own id are removed.
 *           items:
 *             type: string
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
 *         instructor:
 *           type: string
 *           description: Admin only. Reassigns the track to a different instructor (must have role instructor or admin). Rejected/stripped for non-admins.
 *           example: "507f1f77bcf86cd799439011"
 *         instructors:
 *           type: array
 *           description: Admin only (silently dropped for non-admins). REPLACES the whole co-instructor list; send [] to clear it. Same validation as on create. Removing someone revokes their access immediately.
 *           items:
 *             type: string
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
 *
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
    // Stage 4 / round-2 #2.2: co-instructors. `instructor` stays the lead.
    // Admin-set only (see track.controller.js); every id must be a user
    // with role instructor or admin, de-duplicated, and never the lead
    // (see track.service.js#normalizeInstructors). Management authority is
    // computed from this array's CURRENT contents (policy.service.js).
    instructors: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
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
    pendingStudents: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
    pendingLeaves: [
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
        validator(v) {
          if (!v || v === 'https://placehold.co/800x400?text=Trosc+Track')
            return true;
          if (validator.isURL(v, { require_protocol: true })) return true;
          return /^(?!.*[/\\])[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(v);
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

// Indexes for performance
trackSchema.index({ instructor: 1 });
trackSchema.index({ instructors: 1 });
trackSchema.index({ students: 1 });
// For GET /users/me's pendingTrack lookup (Track.findOne({ pendingStudents: userId })
// in user.service.js#getMe) and the "already applied elsewhere" check in
// enrollment.service.js#enrollMeInTrack — same access pattern as the `students`
// index above, just for the pending-approval array instead of the approved one.
trackSchema.index({ pendingStudents: 1 });
trackSchema.index({ published: 1, level: 1 });
trackSchema.index({ title: 'text', description: 'text' }); // For search

// Virtual for enrolled students count
trackSchema.virtual('studentCount').get(function studentCount() {
  return this.students ? this.students.length : 0;
});

// Virtual for session count
trackSchema.virtual('sessionCount').get(function sessionCount() {
  return this.sessions ? this.sessions.length : 0;
});

// Virtual for course count
trackSchema.virtual('courseCount').get(function courseCount() {
  return this.courses ? this.courses.length : 0;
});

// Virtual: total content count (courses + direct sessions)
trackSchema.virtual('contentCount').get(function contentCount() {
  const courseCount = this.courses ? this.courses.length : 0;
  const sessionCount = this.sessions ? this.sessions.length : 0;
  return {
    courses: courseCount,
    sessions: sessionCount,
    total: courseCount + sessionCount,
  };
});

// Populate the lead and the co-instructors on every query. Only _id, name
// and photo: Track responses are public (GET /tracks, /tracks/:id), so an
// instructor's email and role must never leave through them (same privacy
// rule as round-2 #1.3).
trackSchema.pre(/^find/, function populateInstructor(next) {
  this.populate({ path: 'instructor', select: 'name photo' });
  this.populate({ path: 'instructors', select: 'name photo' });
  next();
});

const Track = mongoose.model('Track', trackSchema);

module.exports = Track;
