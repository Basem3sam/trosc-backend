/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       description: Represents a user account in the Trosc platform.
 *       required:
 *         - name
 *         - email
 *         - password
 *         - passwordConfirm
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated MongoDB ObjectId
 *           example: 66f5d42e2d4a3a7b8c5e9f20
 *         name:
 *           type: string
 *           description: The user's full name
 *           example: Basem Esam
 *         email:
 *           type: string
 *           format: email
 *           description: Unique email address used for login and verification
 *           example: basem@example.com
 *         photo:
 *           type: string
 *           description: Filename or URL of the user's profile picture
 *           example: default.jpg
 *         role:
 *           type: string
 *           description: User's role and permission level in the system
 *           enum: [student, instructor, admin]
 *           default: student
 *           example: student
 *         bio:
 *           type: string
 *           description: Short personal bio or title for display in profile
 *           example: Backend Engineer | ICPC Competitor | GDG Instructor
 *         emailVerified:
 *           type: boolean
 *           description: Indicates whether the user's email is verified
 *           default: false
 *         password:
 *           type: string
 *           format: password
 *           description: Secure password (minimum 8 characters)
 *           example: StrongPassword123!
 *         passwordConfirm:
 *           type: string
 *           format: password
 *           description: Must match the password field during registration
 *           example: StrongPassword123!
 *         enrolledTracks:
 *           type: array
 *           description: List of Track IDs that the user is enrolled in
 *           items:
 *             type: string
 *             example: 66f5d42e2d4a3a7b8c5e9f21
 *         active:
 *           type: boolean
 *           default: true
 *           description: Indicates whether the user's account is active
 *         passwordChangedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the user last changed their password
 *           example: 2025-10-18T12:10:00.000Z
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the user was first registered
 *           example: 2025-10-18T14:30:00.000Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the user record was last updated
 *           example: 2025-10-18T14:31:00.000Z
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the user's last successful login
 *           example: 2025-10-18T15:00:00.000Z
 *       example:
 *         name: Basem Esam
 *         email: basem@example.com
 *         role: student
 *         photo: default.jpg
 *         bio: Backend Engineer | ICPC Competitor
 *         emailVerified: true
 *         enrolledTracks: []
 *         active: true
 *         createdAt: 2025-10-18T14:30:00.000Z
 *         updatedAt: 2025-10-18T14:31:00.000Z
 */

const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please tell us your name!'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    photo: {
      type: String,
      default: 'default.jpg',
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [200, 'Bio cannot exceed 200 characters'],
    },
    role: {
      type: String,
      enum: ['student', 'instructor', 'admin'],
      default: 'student',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 8,
      select: false, // hides password from queries
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your password'],
      validate: {
        // Works only on CREATE & SAVE!
        validator: function (el) {
          return el === this.password;
        },
        message: 'Passwords are not the same!',
      },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    enrolledTracks: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Track',
      },
    ],
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

/* 🧩 MIDDLEWARES */

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined; // remove confirm field
  next();
});

// Set passwordChangedAt before save if password is modified
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  // Ensure JWT iat < passwordChangedAt
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

/* 🔐 METHODS */

// Compare user passwords
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Check if user changed password after token issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Create and hash password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // valid for 10 mins
  return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
