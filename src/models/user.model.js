/**
 * @swagger
 * components:
 *   schemas:
 *     UserBase:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 507f1f77bcf86cd799439011
 *         name:
 *           type: string
 *           example: Basem Esam
 *         email:
 *           type: string
 *           format: email
 *           example: basem@example.com
 *         photo:
 *           type: string
 *           example: default.jpg
 *         bio:
 *           type: string
 *           example: Backend Engineer | ICPC Competitor
 *         role:
 *           type: string
 *           enum: [student, admin, instructor]
 *           example: student
 *         enrolledTracks:
 *           type: array
 *           items:
 *             type: string
 *           example: [507f1f77bcf86cd799439012]
 *         active:
 *           type: boolean
 *           example: true
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           example: 2025-10-18T15:00:00.000Z
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2025-10-18T14:30:00.000Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: 2025-10-18T14:31:00.000Z
 *
 *     UserCreate:
 *       type: object
 *       required: [name, email, password, passwordConfirm]
 *       properties:
 *         name:
 *           type: string
 *           minLength: 3
 *           maxLength: 50
 *           example: Basem Esam
 *         email:
 *           type: string
 *           format: email
 *           example: basem@example.com
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *           example: StrongP@ssw0rd123
 *         passwordConfirm:
 *           type: string
 *           format: password
 *           example: StrongP@ssw0rd123
 *         photo:
 *           type: string
 *           example: profile.jpg
 *         bio:
 *           type: string
 *           maxLength: 500
 *           example: Backend Engineer | ICPC Competitor
 *
 *     AuthLogin:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: basem@example.com
 *         password:
 *           type: string
 *           format: password
 *           example: StrongP@ssw0rd123
 *
 *     TokenResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: success
 *         token:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/UserBase'
 *
 *     StandardError:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: fail
 *         message:
 *           type: string
 *           example: Error description here
 *
 *     UsersResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: success
 *         results:
 *           type: integer
 *           example: 5
 *         total:
 *           type: integer
 *           example: 20
 *         data:
 *           type: object
 *           properties:
 *             users:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserBase'
 *
 *     PasswordReset:
 *       type: object
 *       required: [password, passwordConfirm]
 *       properties:
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *           example: StrongP@ssw0rd123
 *         passwordConfirm:
 *           type: string
 *           format: password
 *           example: StrongP@ssw0rd123
 *
 *     PasswordUpdate:
 *       type: object
 *       required: [passwordCurrent, password, passwordConfirm]
 *       properties:
 *         passwordCurrent:
 *           type: string
 *           format: password
 *           example: OldP@ssw0rd123
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *           example: StrongP@ssw0rd123
 *         passwordConfirm:
 *           type: string
 *           format: password
 *           example: StrongP@ssw0rd123
 *
 *     UserAdminCreate:
 *       type: object
 *       required: [name, email, password, passwordConfirm]
 *       properties:
 *         name:
 *           type: string
 *           example: Basem Esam
 *         email:
 *           type: string
 *           format: email
 *           example: basem@example.com
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *           example: StrongP@ssw0rd123
 *         passwordConfirm:
 *           type: string
 *           format: password
 *           example: StrongP@ssw0rd123
 *         role:
 *           type: string
 *           enum: [student, instructor, admin]
 *           example: student
 *         photo:
 *           type: string
 *           example: profile.jpg
 *         bio:
 *           type: string
 *           example: Backend Engineer
 *         website:
 *           type: string
 *           example: https://example.com
 *         socialMedia:
 *           type: object
 *           properties:
 *             twitter: { type: string }
 *             linkedin: { type: string }
 *             github: { type: string }
 *         active:
 *           type: boolean
 *           example: true
 *         emailVerified:
 *           type: boolean
 *           example: false
 *
 *     UserAdminUpdate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: Basem Updated
 *         email:
 *           type: string
 *           format: email
 *           example: basem.updated@example.com
 *         role:
 *           type: string
 *           enum: [student, instructor, admin]
 *           example: instructor
 *         photo:
 *           type: string
 *           example: new-avatar.jpg
 *         bio:
 *           type: string
 *           example: Senior Backend Engineer
 *         website:
 *           type: string
 *           example: https://new-website.com
 *         socialMedia:
 *           type: object
 *           properties:
 *             twitter: { type: string }
 *             linkedin: { type: string }
 *             github: { type: string }
 *         active:
 *           type: boolean
 *           example: true
 *         emailVerified:
 *           type: boolean
 *           example: true
 *
 *   responses:
 *     Unauthorized:
 *       description: Access token is missing or invalid
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StandardError'
 *     ValidationError:
 *       description: Validation failed
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StandardError'
 *     NotFound:
 *       description: Resource not found
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StandardError'
 *     Forbidden:
 *       description: Insufficient permissions
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StandardError'
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
      default: 'https://placehold.co/800x400?text=Trosc+User',
      validate: {
        validator: function (v) {
          if (!v || v === 'https://placehold.co/800x400?text=Trosc+User')
            return true;
          if (validator.isURL(v, { require_protocol: true })) return true;
          return /^(?!.*[\/\\])[a-zA-Z0-9_\-]+\.(jpg|jpeg|png|webp)$/i.test(v);
        },
        message: 'Photo must be a valid URL or image filename',
      },
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    website: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return validator.isURL(v, { require_protocol: true });
        },
        message: 'Website must be a valid URL (e.g., https://example.com)',
      },
    },
    socialMedia: {
      twitter: {
        type: String,
        trim: true,
        validate: {
          validator: function (v) {
            if (!v) return true;
            return validator.isURL(v, { require_protocol: true });
          },
          message: 'Twitter URL must be valid',
        },
      },
      linkedin: {
        type: String,
        trim: true,
        validate: {
          validator: function (v) {
            if (!v) return true;
            return validator.isURL(v, { require_protocol: true });
          },
          message: 'LinkedIn URL must be valid',
        },
      },
      github: {
        type: String,
        trim: true,
        validate: {
          validator: function (v) {
            if (!v) return true;
            return validator.isURL(v, { require_protocol: true });
          },
          message: 'GitHub URL must be valid',
        },
      },
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
    passwordChangedAt: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
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

// For enrollment lookups
userSchema.index({ enrolledTracks: 1 });

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
