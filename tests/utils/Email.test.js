jest.unmock('../../src/utils/Email');
jest.mock('../../src/config/mailer.config', () => jest.fn());
jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));
jest.mock('html-to-text', () => ({
  convert: jest.fn((html) => `TEXT: ${html}`),
}));
const { convert } = require('html-to-text');
const Email = require('../../src/utils/Email');
const createTransporter = require('../../src/config/mailer.config');
const { logger } = require('../../src/utils/logger');

const mockTransporter = { sendMail: jest.fn() };
describe('Email', () => {
  let user;
  let url;
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransporter.sendMail.mockResolvedValue({
      messageId: 'test-message-id',
      response: '250 OK',
    });
    createTransporter.mockReturnValue(mockTransporter);
    user = { email: 'test@example.com', name: 'John Doe' };
    url = 'https://trosc.club/test';
    delete process.env.EMAIL_FROM;
  });
  describe('constructor', () => {
    test('should create an instance with correct properties', () => {
      const email = new Email(user, url);
      expect(email.to).toBe('test@example.com');
      expect(email.firstName).toBe('John');
      expect(email.url).toBe(url);
      expect(email.from).toBe('Trosc Club <noreply@trosc.club>');
      expect(email.transporter).toBe(mockTransporter);
    });
    test('should use EMAIL_FROM environment variable when provided', () => {
      process.env.EMAIL_FROM = 'Custom <custom@example.com>';
      const email = new Email(user, url);
      expect(email.from).toBe('Custom <custom@example.com>');
      delete process.env.EMAIL_FROM;
    });
    test('should extract first name correctly', () => {
      const email = new Email(
        { email: 'test@example.com', name: 'Mohamed Ahmed Ali' },
        url,
      );
      expect(email.firstName).toBe('Mohamed');
    });
  });
  describe('send', () => {
    test('should send an email successfully', async () => {
      const email = new Email(user, url);
      const result = await email.send('Test Subject', '<h1>Hello World</h1>');
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'Trosc Club <noreply@trosc.club>',
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<h1>Hello World</h1>',
        text: 'TEXT: <h1>Hello World</h1>',
        headers: { 'X-Priority': '3', 'X-Mailer': 'Trosc Mailer 1.0' },
      });
      expect(convert).toHaveBeenCalledWith('<h1>Hello World</h1>', {
        wordwrap: 130,
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Email sent to test@example.com: test-message-id',
      );
      expect(result).toEqual({
        messageId: 'test-message-id',
        response: '250 OK',
      });
    });
    test('should throw an error when sending fails', async () => {
      mockTransporter.sendMail.mockRejectedValue(
        new Error('SMTP connection failed'),
      );
      const email = new Email(user, url);
      await expect(email.send('Test Subject', '<p>Hello</p>')).rejects.toThrow(
        'Email sending failed: SMTP connection failed',
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send email to test@example.com:',
        'SMTP connection failed',
      );
    });
  });
  describe('sendWelcome', () => {
    test('should send a welcome email', async () => {
      const email = new Email(user, url);
      await email.sendWelcome();
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe('test@example.com');
      expect(mailOptions.subject).toBe(
        'Welcome to Trosc - Start Your Learning Journey',
      );
      expect(mailOptions.html).toContain('Welcome to Trosc!');
      expect(mailOptions.html).toContain('Hello, John!');
      expect(mailOptions.html).toContain(url);
      expect(mailOptions.html).toContain(
        'Explore available tracks and sessions',
      );
      expect(mailOptions.html).toContain('Connect with instructors and peers');
    });
    test('should include the current year in the welcome email', async () => {
      const email = new Email(user, url);
      await email.sendWelcome();
      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      const currentYear = new Date().getFullYear();
      expect(mailOptions.html).toContain(
        `&copy; ${currentYear} Trosc Student Club`,
      );
    });
  });
  describe('sendPasswordReset', () => {
    test('should send a password reset email', async () => {
      const email = new Email(user, url);
      await email.sendPasswordReset();
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe('test@example.com');
      expect(mailOptions.subject).toBe(
        'Password Reset Request - Trosc Account',
      );
      expect(mailOptions.html).toContain('Password Reset');
      expect(mailOptions.html).toContain('Hello John,');
      expect(mailOptions.html).toContain(url);
      expect(mailOptions.html).toContain('10 minutes');
      expect(mailOptions.html).toContain("If you didn't request this reset");
    });
    test('should include the reset URL in the email', async () => {
      const resetUrl = 'https://trosc.club/reset/abc123';
      const email = new Email(user, resetUrl);
      await email.sendPasswordReset();
      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain(resetUrl);
    });
  });
  describe('sendEnrollmentConfirmation', () => {
    test('should send an enrollment confirmation email', async () => {
      const email = new Email(user, url);
      await email.sendEnrollmentConfirmation('Backend Development');
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe('test@example.com');
      expect(mailOptions.subject).toBe(
        '✅ Enrollment Confirmed - Backend Development',
      );
      expect(mailOptions.html).toContain("You're Enrolled!");
      expect(mailOptions.html).toContain('Hello John,');
      expect(mailOptions.html).toContain('Backend Development');
      expect(mailOptions.html).toContain(url);
      expect(mailOptions.html).toContain('Access Course');
    });
    test('should handle different course names', async () => {
      const email = new Email(user, url);
      await email.sendEnrollmentConfirmation('Flutter Development');
      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.subject).toBe(
        '✅ Enrollment Confirmed - Flutter Development',
      );
      expect(mailOptions.html).toContain('Flutter Development');
    });
  });
  describe('sendSessionReminder', () => {
    test('should send a session reminder email', async () => {
      const email = new Email(user, url);
      await email.sendSessionReminder('Node.js Backend Session', '7:00 PM');
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe('test@example.com');
      expect(mailOptions.subject).toBe(
        '🔔 Reminder: Node.js Backend Session Starting Soon',
      );
      expect(mailOptions.html).toContain('Session Reminder');
      expect(mailOptions.html).toContain('Hello John,');
      expect(mailOptions.html).toContain('Node.js Backend Session');
      expect(mailOptions.html).toContain('7:00 PM');
      expect(mailOptions.html).toContain(url);
      expect(mailOptions.html).toContain('Join Session');
    });
    test('should handle different session times', async () => {
      const email = new Email(user, url);
      await email.sendSessionReminder('React Session', '10:30 AM');
      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.subject).toBe(
        '🔔 Reminder: React Session Starting Soon',
      );
      expect(mailOptions.html).toContain('10:30 AM');
    });
  });
  describe('transporter', () => {
    test('should reuse the same transporter', () => {
      const email1 = new Email(user, url);
      const email2 = new Email(
        { email: 'another@example.com', name: 'Jane Smith' },
        url,
      );
      expect(email1.transporter).toBe(mockTransporter);
      expect(email2.transporter).toBe(mockTransporter);
      expect(email1.transporter).toBe(email2.transporter);
    });
  });
});
