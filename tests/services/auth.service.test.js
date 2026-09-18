const jwt = require('jsonwebtoken');
const authService = require('../../src/services/auth.service');
const User = require('../../src/models/user.model');
const Email = require('../../src/utils/Email'); // jest-mocked globally (see setupAfterEnv.js)
const { createTestUser } = require('../helpers/testUser');

describe('auth.service — internal guards not reachable via the validated HTTP routes', () => {
  describe('login', () => {
    it('throws 400 when email is missing', async () => {
      await expect(
        authService.login(undefined, 'somepassword'),
      ).rejects.toThrow('Please provide email and password.');
    });

    it('throws 400 when password is missing', async () => {
      await expect(
        authService.login('someone@example.com', undefined),
      ).rejects.toThrow('Please provide email and password.');
    });
  });

  describe('login — rememberMe controls JWT lifetime', () => {
    const password = 'Password123!';

    it('issues a ~30 day token when rememberMe is true', async () => {
      const { user } = await createTestUser({
        email: 'remember-true@example.com',
        password,
      });

      const { token } = await authService.login(user.email, password, true);
      const decoded = jwt.decode(token);
      const days = (decoded.exp - decoded.iat) / (24 * 60 * 60);

      expect(days).toBeCloseTo(30, 0);
    });

    it('issues a ~1 day token when rememberMe is false', async () => {
      const { user } = await createTestUser({
        email: 'remember-false@example.com',
        password,
      });

      const { token } = await authService.login(user.email, password, false);
      const decoded = jwt.decode(token);
      const days = (decoded.exp - decoded.iat) / (24 * 60 * 60);

      expect(days).toBeCloseTo(1, 0);
    });

    it('defaults to the ~1 day token when rememberMe is omitted', async () => {
      const { user } = await createTestUser({
        email: 'remember-omitted@example.com',
        password,
      });

      const { token } = await authService.login(user.email, password);
      const decoded = jwt.decode(token);
      const days = (decoded.exp - decoded.iat) / (24 * 60 * 60);

      expect(days).toBeCloseTo(1, 0);
    });
  });

  describe('updatePassword', () => {
    it('throws 400 when any password field is missing', async () => {
      const { user } = await createTestUser();
      await expect(
        authService.updatePassword(
          user._id,
          '',
          'NewPassword123!',
          'NewPassword123!',
        ),
      ).rejects.toThrow('All password fields are required');
    });
  });
});

describe('auth.service — best-effort email failures never block the request', () => {
  it('signUp still succeeds even if the welcome email fails to send', async () => {
    const sendSpy = jest
      .spyOn(Email.prototype, 'sendWelcome')
      .mockRejectedValueOnce(new Error('SMTP unreachable'));

    const { token, user } = await authService.signUp(
      {
        name: 'Welcome Fail User',
        email: 'welcome-fail@example.com',
        password: 'Password123!',
        passwordConfirm: 'Password123!',
      },
      'https://trosc.club/v1/users/me',
    );

    expect(token).toBeDefined();
    expect(user.email).toBe('welcome-fail@example.com');

    sendSpy.mockRestore();
  });

  it('forgotPassword clears the reset token and throws 500 if the email fails to send', async () => {
    const { user } = await createTestUser({ email: 'reset-fail@example.com' });

    const sendSpy = jest
      .spyOn(Email.prototype, 'sendPasswordReset')
      .mockRejectedValueOnce(new Error('SMTP unreachable'));

    await expect(authService.forgotPassword(user.email)).rejects.toThrow(
      'Error sending the email. Try again later!',
    );

    const refreshed = await User.findById(user._id).select(
      '+passwordResetToken +passwordResetExpires',
    );
    expect(refreshed.passwordResetToken).toBeUndefined();
    expect(refreshed.passwordResetExpires).toBeUndefined();

    sendSpy.mockRestore();
  });
});
