const Contact = require('../models/contact.model');
const APIFeatures = require('../utils/APIFeatures');
const AppError = require('../utils/AppError');
const Email = require('../utils/Email');
const logger = require('../utils/logger');

/**
 * Store a contact form submission and (best-effort) notify the admin by email.
 * Email failures never block or fail the submission — the message is already
 * saved to the DB by the time we attempt to send it.
 * @param {Object} data - { username, track, email, phone, message }
 * @returns {Promise<Contact>}
 */
exports.submitContactForm = async (data) => {
  const contact = await Contact.create(data);

  if (process.env.ADMIN_EMAIL) {
    try {
      const adminNotification = new Email(
        { email: process.env.ADMIN_EMAIL, name: 'Admin' },
        null,
      );
      await adminNotification.send(
        `New Contact Form Submission — ${data.username}`,
        `
          <h2>New contact form submission</h2>
          <p><strong>Name:</strong> ${data.username}</p>
          <p><strong>Track:</strong> ${data.track}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone}</p>
          <p><strong>Message:</strong></p>
          <p>${data.message}</p>
        `,
      );
    } catch (error) {
      // Don't let a mail-transport failure fail the user's request —
      // the submission is already persisted above.
      logger.error(
        `Failed to send contact form notification email: ${error.message}`,
      );
    }
  } else {
    logger.warn(
      'ADMIN_EMAIL not set — skipping contact form notification email.',
    );
  }

  return contact;
};

/**
 * Get all contact submissions, newest first. Admin only.
 * @param {Object} query
 * @returns {Promise<{contacts, total, pagination}>}
 */
exports.getAllContacts = async (query) => {
  const baseQuery = Contact.find().sort({ createdAt: -1 });
  const features = new APIFeatures(baseQuery, query, Contact)
    .filter()
    .limitFields();

  await features.paginate();
  const contacts = await features.query;

  return {
    contacts: contacts || [],
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};

/**
 * Get a single contact submission by ID. Admin only.
 * @param {string} id
 * @returns {Promise<Contact>}
 */
exports.getContactById = async (id) => {
  const contact = await Contact.findById(id);
  if (!contact) {
    throw new AppError('No contact submission found with that ID', 404);
  }
  return contact;
};

/**
 * Update a contact submission's status (new/read/archived). Admin only.
 * @param {string} id
 * @param {string} status
 * @returns {Promise<Contact>}
 */
exports.updateContactStatus = async (id, status) => {
  const contact = await Contact.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true },
  );
  if (!contact) {
    throw new AppError('No contact submission found with that ID', 404);
  }
  return contact;
};
