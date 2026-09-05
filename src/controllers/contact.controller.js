const contactService = require('../services/contact.service');
const catchAsync = require('../utils/catchAsync');

exports.submitContactForm = catchAsync(async (req, res, next) => {
  await contactService.submitContactForm(req.body);

  res.status(200).json({
    status: 'success',
    message: "Your message has been received. We'll be in touch soon!",
  });
});
