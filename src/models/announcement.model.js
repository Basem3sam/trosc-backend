/**
 * @swagger
 * components:
 *   schemas:
 *     Announcement:
 *       type: object
 *       required:
 *         - title
 *         - message
 *         - createdBy
 *       properties:
 *         _id:
 *           type: string
 *           example: 6713b5ac12ef4567890a7777
 *         title:
 *           type: string
 *           description: Announcement title
 *           example: "New Track Available: Full Stack Web Development"
 *         message:
 *           type: string
 *           description: Announcement body content
 *           example: "We are excited to launch our new track covering React, Node.js, and MongoDB."
 *         audience:
 *           type: string
 *           enum: [all, track, course]
 *           default: all
 *           example: all
 *         targetTrack:
 *           type: string
 *           description: Optional track ID if audience is 'track'
 *           example: 67123abc12ef4567890a1234
 *         targetCourse:
 *           type: string
 *           description: Optional course ID if audience is 'course'
 *           example: 67123abc12ef4567890a5678
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *           example: ["announcement-poster.jpg", "schedule.pdf"]
 *         createdBy:
 *           type: string
 *           description: ObjectId reference to admin who created it
 *           example: 67123abc12ef4567890a9999
 *         isPinned:
 *           type: boolean
 *           default: false
 *           example: true
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

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Announcement must have a title'],
    },
    message: {
      type: String,
      required: [true, 'Announcement must have a message'],
    },
    audience: {
      type: String,
      enum: ['all', 'track', 'course'],
      default: 'all',
    },
    targetTrack: {
      type: mongoose.Schema.ObjectId,
      ref: 'Track',
    },
    targetCourse: {
      type: mongoose.Schema.ObjectId,
      ref: 'Course',
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
                'dl.dropboxusercontent.com',
                'github.com',
                'raw.githubusercontent.com',
                'res.cloudinary.com',
                'i.imgur.com',
                'imgur.com',
                'cdn.discordapp.com',
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
        message: 'Attachments must be valid URLs from trusted hosts',
      },
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Announcement must have a creator'],
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// For pinned announcements feed (pinned first, then newest)
announcementSchema.index({ isPinned: -1, createdAt: -1 });

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;

/**
 * @swagger
 * components:
 *   schemas:
 *     AnnouncementCreate:
 *       type: object
 *       required:
 *         - title
 *         - message
 *       properties:
 *         title:
 *           type: string
 *           example: "New Track Available: Full Stack Web Development"
 *         message:
 *           type: string
 *           example: "We are excited to launch our new track covering React, Node.js, and MongoDB."
 *         audience:
 *           type: string
 *           enum: [all, track, course]
 *           default: all
 *         targetTrack:
 *           type: string
 *           example: 67123abc12ef4567890a1234
 *         targetCourse:
 *           type: string
 *           example: 67123abc12ef4567890a5678
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *         isPinned:
 *           type: boolean
 *           default: false
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AnnouncementUpdate:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           example: "Updated Title"
 *         message:
 *           type: string
 *           example: "Updated message content"
 *         audience:
 *           type: string
 *           enum: [all, track, course]
 *         targetTrack:
 *           type: string
 *         targetCourse:
 *           type: string
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *         isPinned:
 *           type: boolean
 */
