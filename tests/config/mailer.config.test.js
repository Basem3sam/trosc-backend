const jestMock = jest;

jestMock.mock('nodemailer');

describe('mailer.config.js', () => {
  let originalEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jestMock.clearAllMocks();
    jestMock.resetModules();
  });

  it('creates a transporter with service in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.EMAIL_SERVICE = 'SendGrid';
    process.env.EMAIL_USER = 'testuser';
    process.env.EMAIL_PASS = 'testpass';

    const nodemailer = require('nodemailer');
    const createTransporter = require('../../src/config/mailer.config');

    createTransporter();

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      service: 'SendGrid',
      auth: {
        user: 'testuser',
        pass: 'testpass',
      },
    });
  });

  it('uses host/port in development (non-production)', () => {
    process.env.NODE_ENV = 'development';
    process.env.EMAIL_HOST = 'smtp.mailtrap.io';
    process.env.EMAIL_PORT = '2525';
    process.env.EMAIL_USER = 'devuser';
    process.env.EMAIL_PASS = 'devpass';

    const nodemailer = require('nodemailer');
    const createTransporter = require('../../src/config/mailer.config');

    createTransporter();

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.mailtrap.io',
      port: 2525,
      auth: {
        user: 'devuser',
        pass: 'devpass',
      },
    });
  });

  it('uses default EMAIL_SERVICE "SendGrid" if not set in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.EMAIL_SERVICE;
    process.env.EMAIL_USER = 'testuser';
    process.env.EMAIL_PASS = 'testpass';

    const nodemailer = require('nodemailer');
    const createTransporter = require('../../src/config/mailer.config');

    createTransporter();

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      service: 'SendGrid',
      auth: {
        user: 'testuser',
        pass: 'testpass',
      },
    });
  });

  it('uses default port 2525 if EMAIL_PORT not set in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.EMAIL_HOST = 'smtp.mailtrap.io';
    delete process.env.EMAIL_PORT;
    process.env.EMAIL_USER = 'devuser';
    process.env.EMAIL_PASS = 'devpass';

    const nodemailer = require('nodemailer');
    const createTransporter = require('../../src/config/mailer.config');

    createTransporter();

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.mailtrap.io',
      port: 2525,
      auth: {
        user: 'devuser',
        pass: 'devpass',
      },
    });
  });
});
