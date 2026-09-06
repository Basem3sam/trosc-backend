const contactService = require('../services/contact.service');
const catchAsync = require('../utils/catchAsync');

exports.submitContactForm = catchAsync(async (req, res, next) => {
  await contactService.submitContactForm(req.body);

  res.status(200).json({
    status: 'success',
    message: "Your message has been received. We'll be in touch soon!",
  });
});

exports.getAllContacts = catchAsync(async (req, res, next) => {
  const { contacts, total, pagination } = await contactService.getAllContacts(
    req.query,
  );

  res.status(200).json({
    status: 'success',
    results: contacts.length,
    total,
    pagination,
    data: { contacts },
  });
});

exports.getContact = catchAsync(async (req, res, next) => {
  const contact = await contactService.getContactById(req.params.id);

  res.status(200).json({
    status: 'success',
    data: { contact },
  });
});

exports.updateContact = catchAsync(async (req, res, next) => {
  const contact = await contactService.updateContactStatus(
    req.params.id,
    req.body.status,
  );

  res.status(200).json({
    status: 'success',
    data: { contact },
  });
});
