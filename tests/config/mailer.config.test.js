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

  it('creates a Brevo HTTP transport in production, not nodemailer', () => {
    process.env.NODE_ENV = 'production';
    process.env.BREVO_API_KEY = 'test-brevo-key';

    const nodemailer = require('nodemailer');
    const createTransporter = require('../../src/config/mailer.config');

    const transporter = createTransporter();

    // Render blocks outbound SMTP in production, so the prod path must
    // never touch nodemailer — only the dev/Mailtrap path should.
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(typeof transporter.sendMail).toBe('function');
  });

  describe('Brevo transport sendMail()', () => {
    let originalFetch;

    beforeEach(() => {
      originalFetch = global.fetch;
      process.env.NODE_ENV = 'production';
      process.env.BREVO_API_KEY = 'test-brevo-key';
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('posts to the Brevo API with the parsed sender, recipient, and content', async () => {
      global.fetch = jestMock.fn().mockResolvedValue({
        ok: true,
        json: jestMock.fn().mockResolvedValue({ messageId: 'brevo-msg-1' }),
      });

      const createTransporter = require('../../src/config/mailer.config');
      const transporter = createTransporter();

      const info = await transporter.sendMail({
        from: 'Trosc Club <troscscu2@gmail.com>',
        to: 'someone@example.com',
        subject: 'Welcome',
        html: '<p>Hi</p>',
        text: 'Hi',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.brevo.com/v3/smtp/email',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'api-key': 'test-brevo-key' }),
        }),
      );

      const [, options] = global.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.sender).toEqual({
        name: 'Trosc Club',
        email: 'troscscu2@gmail.com',
      });
      expect(body.to).toEqual([{ email: 'someone@example.com' }]);
      expect(body.subject).toBe('Welcome');
      expect(info.messageId).toBe('brevo-msg-1');
    });

    it('throws with the response body when Brevo returns a non-ok status', async () => {
      global.fetch = jestMock.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: jestMock.fn().mockResolvedValue('Invalid API key'),
      });

      const createTransporter = require('../../src/config/mailer.config');
      const transporter = createTransporter();

      await expect(
        transporter.sendMail({
          from: 'Trosc Club <troscscu2@gmail.com>',
          to: 'someone@example.com',
          subject: 'Welcome',
          html: '<p>Hi</p>',
          text: 'Hi',
        }),
      ).rejects.toThrow('Brevo API error 401: Invalid API key');
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
