/**
 * @swagger
 * components:
 *   schemas:
 *     Contact:
 *       type: object
 *       required:
 *         - username
 *         - track
 *         - email
 *         - phone
 *         - message
 *       properties:
 *         _id:
 *           type: string
 *           example: 6713b5ac12ef4567890a6666
 *         username:
 *           type: string
 *           example: "Basem Esam"
 *         track:
 *           type: string
 *           example: "Backend Development"
 *         email:
 *           type: string
 *           example: "basem@example.com"
 *         phone:
 *           type: string
 *           example: "+201234567890"
 *         message:
 *           type: string
 *           example: "I'd like to know more about the upcoming cohort."
 *         status:
 *           type: string
 *           enum: [new, read, archived]
 *           default: new
 *         createdAt:
 *           type: string
 *           format: date-time
 */

const mongoose = require('mongoose');
const validator = require('validator');

const contactSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    track: {
      type: String,
      required: [true, 'Track is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      minlength: [10, 'Message must be at least 10 characters'],
    },
    status: {
      type: String,
      enum: ['new', 'read', 'archived'],
      default: 'new',
    },
  },
  { timestamps: true },
);

const Contact = mongoose.model('Contact', contactSchema);
module.exports = Contact;
