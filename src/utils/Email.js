const { convert } = require('html-to-text');
const createTransporter = require('../config/mailer.config');

class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.form = process.env.EMAIL_FORM;
    this.transporter = createTransporter();
  }

  // Send actual email
  async send(subject, htmlContent) {
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html: htmlContent,
      text: convert(htmlContent),
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send(
      'Welcome to Trosc 🎉',
      `<h1>Welcome, ${this.firstName}!</h1>
       <p>We’re thrilled to have you at Trosc.</p>
       <p>Start exploring: <a href="${this.url}">${this.url}</a></p>`,
    );
  }

  async sendPasswordReset() {
    await this.send(
      'Your password reset link (valid for 10 min)',
      `<p>Hello ${this.firstName},</p>
       <p>Forgot your password? Click the link below to reset it:</p>
       <a href="${this.url}">${this.url}</a>
       <p>If you didn’t request this, please ignore this email.</p>`,
    );
  }
}

module.exports = Email;
