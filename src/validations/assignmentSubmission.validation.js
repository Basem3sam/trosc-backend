const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/, 'MongoDB ObjectId');

exports.assignmentIdSchema = Joi.object({
  id: objectId.required().messages({
    'string.pattern.base': 'Assignment ID must be a valid MongoDB ID',
  }),
});

// :id (assignment) + :studentId (whose submission to grade)
exports.assignmentStudentIdSchema = Joi.object({
  id: objectId.required().messages({
    'string.pattern.base': 'Assignment ID must be a valid MongoDB ID',
  }),
  studentId: objectId.required().messages({
    'string.pattern.base': 'Student ID must be a valid MongoDB ID',
  }),
});

// Same trusted-host allowlist as src/utils/attachmentValidation.js, applied
// to a single URL instead of an array (a submission has exactly one file).
const ALLOWED_HOSTS = [
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
  'media.discordapp.net',
];

const fileUrlSchema = Joi.string()
  .uri()
  .required()
  .custom((value, helpers) => {
    try {
      const url = new URL(value);
      const isAllowedHost = ALLOWED_HOSTS.some((host) =>
        url.hostname.endsWith(host),
      );

      if (!isAllowedHost || url.protocol !== 'https:') {
        return helpers.error('any.invalid');
      }

      const dangerous =
        /\.(exe|bat|cmd|sh|msi|dmg|apk|jar|ps1|vbs|wsf|hta|scr|pif|com)/i;
      if (dangerous.test(url.pathname)) {
        return helpers.error('attachment.dangerous');
      }

      return value;
    } catch {
      return helpers.error('any.invalid');
    }
  }, 'Submission file URL validation')
  .messages({
    'any.invalid':
      'Submission file must be a valid URL from a trusted host (Google Drive, Dropbox, GitHub, Cloudinary, Imgur)',
    'attachment.dangerous': 'Executable files are not allowed as submissions',
    'string.empty': 'Submission file URL is required',
  });

exports.submitAssignmentSchema = Joi.object({
  file: fileUrlSchema,
});

exports.gradeSubmissionSchema = Joi.object({
  grade: Joi.number().min(0).max(100).required().messages({
    'number.base': 'Grade must be a number between 0 and 100',
    'number.min': 'Grade must be at least 0',
    'number.max': 'Grade must be at most 100',
    'any.required': 'Grade is required',
  }),
});
