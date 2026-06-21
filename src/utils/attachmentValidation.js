const Joi = require('joi');

// Free hosting services Trosc uses
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

const attachmentValidation = Joi.array()
  .items(
    Joi.string()
      .uri()
      .custom((value, helpers) => {
        if (!value) return value;

        try {
          const url = new URL(value);
          const isAllowedHost = ALLOWED_HOSTS.some((host) =>
            url.hostname.endsWith(host),
          );

          if (!isAllowedHost || url.protocol !== 'https:') {
            return helpers.error('any.invalid');
          }

          // Block dangerous file extensions
          const dangerous =
            /\.(exe|bat|cmd|sh|msi|dmg|apk|jar|ps1|vbs|wsf|hta|scr|pif|com)/i;
          if (dangerous.test(url.pathname)) {
            return helpers.error('attachment.dangerous');
          }

          return value;
        } catch {
          return helpers.error('any.invalid');
        }
      }, 'Attachment URL validation')
      .messages({
        'any.invalid':
          'Attachment must be a valid URL from a trusted host (Google Drive, Dropbox, GitHub, Cloudinary, Imgur)',
        'attachment.dangerous':
          'Executable files are not allowed as attachments',
      }),
  )
  .max(10) // Prevent abuse
  .optional()
  .messages({
    'array.max': 'Maximum 10 attachments allowed',
  });

module.exports = attachmentValidation;
