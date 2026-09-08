const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/user.model');
const { createTestUser } = require('./helpers/testUser');

describe('Password Reset Flow', () => {
  describe('POST /v1/users/forgotPassword', () => {
    it('sends a reset token to existing email (email mocked)', async () => {
      const { user } = await createTestUser({
        email: 'reset-test@example.com',
      });
      const res = await request(app)
        .post('/v1/users/forgotPassword')
        .send({ email: user.email });
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/reset link has been sent/i);
    });

    it('does not reveal if email does not exist (security)', async () => {
      const res = await request(app)
        .post('/v1/users/forgotPassword')
        .send({ email: 'nonexistent@example.com' });
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/reset link has been sent/i);
    });
  });

  describe('PATCH /v1/users/resetPassword/:token', () => {
    it('resets password with a valid token', async () => {
      const { user } = await createTestUser({
        email: 'reset-valid@example.com',
      });
      // Generate a reset token
      const resetToken = user.createPasswordResetToken();
      await user.save({ validateBeforeSave: false });

      const res = await request(app)
        .patch(`/v1/users/resetPassword/${resetToken}`)
        .send({
          password: 'NewPassword123!',
          passwordConfirm: 'NewPassword123!',
        });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();

      // Verify the password was updated by logging in
      const loginRes = await request(app)
        .post('/v1/users/login')
        .send({ email: user.email, password: 'NewPassword123!' });
      expect(loginRes.status).toBe(200);
    });

    it('rejects an invalid token', async () => {
      const res = await request(app)
        .patch('/v1/users/resetPassword/invalidtoken')
        .send({
          password: 'NewPassword123!',
          passwordConfirm: 'NewPassword123!',
        });
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /v1/users/updateMyPassword', () => {
    let user, token;

    beforeEach(async () => {
      const result = await createTestUser({ email: 'update-pw@example.com' });
      user = result.user;
      token = result.token;
    });

    it('updates password when current password is correct', async () => {
      const res = await request(app)
        .patch('/v1/users/updateMyPassword')
        .set('Authorization', `Bearer ${token}`)
        .send({
          passwordCurrent: 'Password123!',
          password: 'NewPassword456!',
          passwordConfirm: 'NewPassword456!',
        });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();

      // Verify new password works
      const loginRes = await request(app)
        .post('/v1/users/login')
        .send({ email: user.email, password: 'NewPassword456!' });
      expect(loginRes.status).toBe(200);
    });

    it('rejects when current password is wrong', async () => {
      const res = await request(app)
        .patch('/v1/users/updateMyPassword')
        .set('Authorization', `Bearer ${token}`)
        .send({
          passwordCurrent: 'WrongPassword!',
          password: 'NewPassword456!',
          passwordConfirm: 'NewPassword456!',
        });
      expect(res.status).toBe(401);
    });
  });
});
