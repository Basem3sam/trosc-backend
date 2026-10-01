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
const isTrustedHost = require('../utils/isTrustedHost');
const { trustedHostMessage } = require('../utils/trustedHostsMessage');

const fileUrlSchema = Joi.string()
  .uri()
  .required()
  .custom((value, helpers) => {
    try {
      const url = new URL(value);
      const isAllowedHost = isTrustedHost(url.hostname);

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
    // #3.1 (Decisions Q1): a submission is a LINK, not an uploaded file.
    // A multipart/form-data upload arrives here as an empty body, which
    // used to surface as the confusing '"file" is required' - say what is
    // actually expected instead.
    //
    // NOTE: never put `{` / `}` in a Joi message string - Joi parses them as
    // template references ({#label}, {{...}}) and would mangle the text.
    'any.required':
      'Submissions are links, not file uploads: send a JSON body with a "file" field set to an https link from a trusted host (e.g. a Google Drive share link) — see GET /v1/config/trusted-hosts',
    'string.base':
      'Submission "file" must be a link (string), e.g. a Google Drive share link — file uploads are not supported',
    'string.uri':
      'Submission "file" must be a link, e.g. a Google Drive share link — file uploads are not supported',
    'any.invalid': trustedHostMessage('Submission file'),
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
  feedback: Joi.string().trim().max(2000).allow('').optional().messages({
    'string.max': 'Feedback cannot exceed 2000 characters',
  }),
});
