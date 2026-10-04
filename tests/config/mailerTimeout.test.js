describe('mailer.config.js - Brevo request deadline', () => {
  let originalEnv;
  let originalFetch;

  const mail = {
    from: 'Trosc Club <troscscu2@gmail.com>',
    to: 'someone@example.com',
    subject: 'Welcome',
    html: '<p>Hi</p>',
    text: 'Hi',
  };

  beforeEach(() => {
    originalEnv = { ...process.env };
    originalFetch = global.fetch;
    process.env.NODE_ENV = 'production';
    process.env.BREVO_API_KEY = 'test-brevo-key';
    jest.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  // A fetch that never answers on its own and only ends when its abort
  // signal fires, like the real one.
  const hangingFetch = () =>
    jest.fn(
      (url, { signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason));
        }),
    );

  it('passes a 5 second abort signal to fetch', async () => {
    const timeout = jest.spyOn(AbortSignal, 'timeout');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ messageId: 'm1' }),
    });

    const createTransporter = require('../../src/config/mailer.config');
    await createTransporter().sendMail(mail);

    expect(timeout).toHaveBeenCalledWith(5000);
    const [, options] = global.fetch.mock.calls[0];
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it('turns a timed-out request into a normal Error', async () => {
    // Make the deadline fire immediately instead of waiting 5 real seconds.
    jest.spyOn(AbortSignal, 'timeout').mockImplementation(() => {
      const controller = new AbortController();
      setTimeout(() => {
        controller.abort(new DOMException('timed out', 'TimeoutError'));
      }, 10);
      return controller.signal;
    });
    global.fetch = hangingFetch();

    const createTransporter = require('../../src/config/mailer.config');

    await expect(createTransporter().sendMail(mail)).rejects.toThrow(
      'Brevo API request timed out after 5000 ms',
    );
  });

  it('still rejects with the original error for other failures', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('socket hang up'));

    const createTransporter = require('../../src/config/mailer.config');

    await expect(createTransporter().sendMail(mail)).rejects.toThrow(
      'socket hang up',
    );
  });
});
