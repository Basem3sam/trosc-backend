/**
 * @swagger
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - date
 *         - locationType
 *         - createdBy
 *       properties:
 *         _id:
 *           type: string
 *           example: 6713b5ac12ef4567890a4444
 *         title:
 *           type: string
 *           description: Event title
 *           example: "Backend Bootcamp: Introduction to Node.js"
 *         description:
 *           type: string
 *           description: Detailed event content
 *           example: "A 3-day backend development workshop covering Node.js, Express, and MongoDB."
 *         track:
 *           type: string
 *           description: Optional ObjectId reference to a Track
 *           example: 67123abc12ef4567890a1234
 *         course:
 *           type: string
 *           description: Optional ObjectId reference to a Course
 *           example: 67123abc12ef4567890a5678
 *         date:
 *           type: string
 *           format: date-time
 *           description: Date and time of the event
 *           example: 2025-11-10T10:00:00.000Z
 *         locationType:
 *           type: string
 *           enum: [online, offline]
 *           description: Whether event is online or physical
 *           example: "online"
 *         locationLink:
 *           type: string
 *           description: Zoom or meeting link for online events
 *           example: "https://zoom.us/meeting/xyz"
 *         locationAddress:
 *           type: string
 *           description: Address or venue for offline events
 *           example: "ITI Smart Village, Cairo"
 *         locationAction:
 *           type: object
 *           nullable: true
 *           properties:
 *             type:
 *               type: string
 *               enum: [online, offline]
 *             url:
 *               type: string
 *               format: uri
 *             label:
 *               type: string
 *           example:
 *             type: online
 *             url: https://zoom.us/meeting/xyz
 *             label: Join Zoom/Meet
 *         coverImage:
 *           type: string
 *           description: Event cover image
 *           example: "bootcamp-cover.jpg"
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *           description: Trusted-host URLs (Drive, GitHub, Cloudinary, etc.)
 *         attendees:
 *           type: array
 *           items:
 *             type: string
 *             description: User ObjectId
 *           example: ["67123abc12ef4567890a2222"]
 *         createdBy:
 *           type: string
 *           description: ObjectId reference to admin/instructor who created the event
 *           example: 67123abc12ef4567890a9999
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
const validator = require('validator');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event must have a title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Event must have a description'],
    },
    track: {
      type: mongoose.Schema.ObjectId,
      ref: 'Track',
    },
    course: {
      type: mongoose.Schema.ObjectId,
      ref: 'Course',
    },
    date: {
      type: Date,
      required: [true, 'Event must have a date'],
    },
    locationType: {
      type: String,
      enum: ['online', 'offline'],
      required: [true, 'Event must have a location type'],
    },
    locationLink: String,
    locationAddress: String,
    coverImage: {
      type: String,
      default: 'https://placehold.co/800x400?text=Trosc+Event',
      validate: {
        validator: function (v) {
          if (!v || v === 'https://placehold.co/800x400?text=Trosc+Event')
            return true;
          if (validator.isURL(v, { require_protocol: true })) return true;
          return /^(?!.*[\/\\])[a-zA-Z0-9_\-]+\.(jpg|jpeg|png|webp)$/i.test(v);
        },
        message: 'Cover image must be a valid URL or image filename',
      },
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
                allowedHosts.some((h) => parsed.hostname.endsWith(h)) &&
                parsed.protocol === 'https:'
              );
            } catch {
              return false;
            }
          });
        },
        message: 'Event attachments must be valid URLs from trusted hosts',
      },
    },
    attendees: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Event must have a creator'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// For upcoming events feed (sorted by date, filtered by future dates)
eventSchema.index({ date: 1 });

// Virtual to help the frontend render the correct button instantly
eventSchema.virtual('locationAction').get(function () {
  if (this.locationType === 'online' && this.locationLink) {
    return {
      type: 'online',
      url: this.locationLink,
      label: 'Join Zoom/Meet',
    };
  }

  if (this.locationType === 'offline' && this.locationAddress) {
    const encoded = encodeURIComponent(this.locationAddress);
    return {
      type: 'offline',
      url: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
      label: 'View on Map',
    };
  }

  return null;
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;

/**
 * @swagger
 * components:
 *   schemas:
 *     EventCreate:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - date
 *         - locationType
 *       properties:
 *         title:
 *           type: string
 *           example: "Backend Bootcamp: Introduction to Node.js"
 *         description:
 *           type: string
 *           example: "A 3-day backend development workshop covering Node.js, Express, and MongoDB."
 *         track:
 *           type: string
 *           example: 67123abc12ef4567890a1234
 *         course:
 *           type: string
 *           example: 67123abc12ef4567890a5678
 *         date:
 *           type: string
 *           format: date-time
 *           example: 2025-11-10T10:00:00.000Z
 *         locationType:
 *           type: string
 *           enum: [online, offline]
 *           example: "online"
 *         locationLink:
 *           type: string
 *           example: "https://zoom.us/meeting/xyz"
 *         locationAddress:
 *           type: string
 *           example: "ITI Smart Village, Cairo"
 *         coverImage:
 *           type: string
 *           example: "bootcamp-cover.jpg"
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     EventUpdate:
 *       type: object
 *       description: Data that can be updated for an event
 *       properties:
 *         title: { type: string, example: "Updated Event Title" }
 *         description: { type: string }
 *         track: { type: string }
 *         course: { type: string }
 *         date: { type: string, format: date-time }
 *         locationType: { type: string, enum: [online, offline] }
 *         locationLink: { type: string }
 *         locationAddress: { type: string }
 *         coverImage: { type: string }
 *         attachments: { type: array, items: { type: string } }
 */
