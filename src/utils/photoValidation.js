const Joi = require('joi');

const photoValidation = Joi.string()
  .custom((value, helpers) => {
    if (!value || value === '') return value; // Allow empty

    // Allow default image
    if (value === 'default-user.jpg') return value;

    // Allow valid URLs (http, https)
    const urlRegex =
      /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/i;

    // Allow simple filenames (profile.jpg, user-photo.png, etc.)
    const filenameRegex = /^[a-zA-Z0-9_\-\.]+\.(jpg|jpeg|png|webp|gif|svg)$/i;

    // Allow data URIs (base64 images)
    const dataUriRegex =
      /^data:image\/(jpeg|png|gif|webp);base64,[a-zA-Z0-9+/]+={0,2}$/;

    if (
      urlRegex.test(value) ||
      filenameRegex.test(value) ||
      dataUriRegex.test(value)
    ) {
      return value;
    }

    return helpers.error('any.invalid');
  }, 'Photo URL or filename validation')
  .messages({
    'any.invalid':
      '"photo" must be a valid URL, image filename, or base64 data URI',
  })
  .optional()
  .allow('', null);

module.exports = photoValidation;
