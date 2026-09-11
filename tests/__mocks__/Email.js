// tests/__mocks__/../src/utils/Email.js
module.exports = class Email {
  constructor(user, url) {
    this.user = user;
    this.url = url;
  }

  async sendWelcome() {
    /* no-op */
  }

  async sendPasswordReset() {
    /* no-op */
  }

  async sendEnrollmentConfirmation(courseName) {
    /* no-op */
  }

  async sendSessionReminder(sessionTitle, startTime) {
    /* no-op */
  }

  async send(subject, html) {
    /* no-op */
  }
};
