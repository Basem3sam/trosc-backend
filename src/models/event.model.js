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
 *         coverImage:
 *           type: string
 *           description: Event cover image
 *           example: "bootcamp-cover.jpg"
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
      default: 'default-event.jpg',
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
  { timestamps: true },
);

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;
