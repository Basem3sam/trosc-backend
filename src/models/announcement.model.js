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
    attachments: [String],
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

const Announcement = mongoose.model('Announcement', announcementSchema);
module.exports = Announcement;
