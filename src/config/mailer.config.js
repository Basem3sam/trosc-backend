const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    // Use a reliable service like Gmail or Gmail in production
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Development: use mailtrap or local smtp
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 2525, // Default to 2525 if not set and ensure it's a number
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

module.exports = createTransporter;
