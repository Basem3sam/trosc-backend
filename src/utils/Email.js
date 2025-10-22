const { convert } = require('html-to-text');
const createTransporter = require('../config/mailer.config');

class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = process.env.EMAIL_FROM || 'Trosc Club <noreply@trosc.club>'; // Fixed typo: form -> from
    this.transporter = createTransporter();
  }

  // Send actual email with error handling
  async send(subject, htmlContent) {
    try {
      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        html: htmlContent,
        text: convert(htmlContent, {
          wordwrap: 130, // Better text formatting
        }),
        // Optional: Add headers for better email deliverability
        headers: {
          'X-Priority': '3', // Normal priority
          'X-Mailer': 'Trosc Mailer 1.0',
        },
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${this.to}: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error(`❌ Failed to send email to ${this.to}:`, error.message);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  async sendWelcome() {
    const subject = 'Welcome to Trosc 🎉 - Start Your Learning Journey';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Trosc!</h1>
            <p>We're excited to have you onboard</p>
          </div>
          <div class="content">
            <h2>Hello, ${this.firstName}!</h2>
            <p>Welcome to Trosc Student Club - your gateway to mastering new skills and connecting with fellow learners.</p>
            
            <p><strong>Here's what you can do now:</strong></p>
            <ul>
              <li>📚 Explore available tracks and sessions</li>
              <li>👥 Connect with instructors and peers</li>
              <li>🎯 Track your learning progress</li>
              <li>💬 Participate in discussions and activities</li>
            </ul>

            <div style="text-align: center;">
              <a href="${this.url}" class="button">Get Started</a>
            </div>

            <p>If you have any questions, feel free to reply to this email. We're here to help!</p>
            
            <p>Happy learning!<br>The Trosc Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Trosc Student Club. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.send(subject, htmlContent);
  }

  async sendPasswordReset() {
    const subject = '🔐 Password Reset Request - Trosc Account';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #ff6b6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
            <p>Secure your Trosc account</p>
          </div>
          <div class="content">
            <h2>Hello ${this.firstName},</h2>
            <p>We received a request to reset your Trosc account password.</p>
            
            <div style="text-align: center;">
              <a href="${this.url}" class="button">Reset Your Password</a>
            </div>

            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This link will expire in <strong>10 minutes</strong></li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Your password will remain unchanged until you complete the reset process</li>
              </ul>
            </div>

            <p><strong>Can't click the button?</strong> Copy and paste this link in your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 5px; font-size: 12px;">${this.url}</p>
            
            <p>Stay secure,<br>The Trosc Security Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Trosc Student Club. All rights reserved.</p>
            <p>This is an automated security message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.send(subject, htmlContent);
  }

  // Additional email templates you might need:

  async sendEnrollmentConfirmation(courseName) {
    const subject = `✅ Enrollment Confirmed - ${courseName}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>🎉 You're Enrolled!</h2>
        <p>Hello ${this.firstName},</p>
        <p>You have been successfully enrolled in <strong>${courseName}</strong>.</p>
        <p>We're excited to have you in this session and can't wait to see your progress!</p>
        <a href="${this.url}" style="background: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Access Course</a>
        <p>Best regards,<br>Trosc Team</p>
      </div>
    `;

    return await this.send(subject, htmlContent);
  }

  async sendSessionReminder(sessionTitle, startTime) {
    const subject = `🔔 Reminder: ${sessionTitle} Starting Soon`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Session Reminder</h2>
        <p>Hello ${this.firstName},</p>
        <p>This is a friendly reminder that your session <strong>${sessionTitle}</strong> is scheduled to start at ${startTime}.</p>
        <a href="${this.url}" style="background: #2196F3; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Join Session</a>
        <p>See you there!<br>Trosc Team</p>
      </div>
    `;

    return await this.send(subject, htmlContent);
  }
}

module.exports = Email;
