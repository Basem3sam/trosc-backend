const request = require('supertest');
const app = require('../src/app');
const Email = require('../src/utils/Email'); // jest-mocked globally (see setupAfterEnv.js)
const { logger } = require('../src/utils/logger');
const User = require('../src/models/user.model');
const Course = require('../src/models/course.model');
const Contact = require('../src/models/contact.model');
const ActivityLog = require('../src/models/activitylog.model');
const authService = require('../src/services/auth.service');
const { createTestUser } = require('./helpers/testUser');
const { waitFor } = require('./helpers/waitFor');

// A send that never settles, like a mail provider that has stopped answering.
const hang = () => new Promise(() => {});

const signupBody = (email) => ({
  name: 'Background User',
  email,
  password: 'Password123!',
  passwordConfirm: 'Password123!',
});

describe('emails are sent in the background', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('welcome email (signup)', () => {
    it('responds even when the send never resolves', async () => {
      const send = jest
        .spyOn(Email.prototype, 'sendWelcome')
        .mockImplementation(hang);

      const res = await request(app)
        .post('/v1/users/signup')
        .send(signupBody('bg-hang@example.com'));

      expect(res.status).toBe(201);
      expect(send).toHaveBeenCalledTimes(1);
    });

    it('logs a failed send with the user id and still succeeds', async () => {
      jest
        .spyOn(Email.prototype, 'sendWelcome')
        .mockRejectedValue(new Error('SMTP unreachable'));
      const errorLog = jest.spyOn(logger, 'error').mockImplementation(() => {});

      const res = await request(app)
        .post('/v1/users/signup')
        .send(signupBody('bg-fail@example.com'));

      expect(res.status).toBe(201);
      await waitFor(() =>
        errorLog.mock.calls.some(
          ([message]) => message === 'Welcome email failed',
        ),
      );
      const [, meta] = errorLog.mock.calls.find(
        ([message]) => message === 'Welcome email failed',
      );
      expect(meta.userId).toBe(res.body.data.user._id);
      expect(meta.error).toBe('SMTP unreachable');
      // Only safe identifiers are logged: no address, no token.
      expect(JSON.stringify(meta)).not.toContain('bg-fail@example.com');
    });
  });

  describe('enrollment confirmation email', () => {
    const buildCourse = async () => {
      const { user: instructor } = await createTestUser({
        role: 'instructor',
      });
      const course = await Course.create({
        title: 'Background Course',
        description: 'For background email tests',
        instructor: instructor._id,
        published: true,
      });
      return course;
    };

    it('responds even when the send never resolves', async () => {
      const course = await buildCourse();
      const { user, token } = await createTestUser();
      const send = jest
        .spyOn(Email.prototype, 'sendEnrollmentConfirmation')
        .mockImplementation(hang);

      const res = await request(app)
        .post(`/v1/courses/${course.id}/enroll-me`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(send).toHaveBeenCalledTimes(1);
      const refreshed = await Course.findById(course._id);
      expect(refreshed.students.map(String)).toContain(user.id);
    });

    it('logs a failed send and the enrollment still succeeds', async () => {
      const course = await buildCourse();
      const { user, token } = await createTestUser();
      jest
        .spyOn(Email.prototype, 'sendEnrollmentConfirmation')
        .mockRejectedValue(new Error('SMTP unreachable'));
      const errorLog = jest.spyOn(logger, 'error').mockImplementation(() => {});

      const res = await request(app)
        .post(`/v1/courses/${course.id}/enroll-me`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      await waitFor(() =>
        errorLog.mock.calls.some(
          ([message]) => message === 'Enrollment confirmation email failed',
        ),
      );
      const [, meta] = errorLog.mock.calls.find(
        ([message]) => message === 'Enrollment confirmation email failed',
      );
      expect(meta.userId).toBe(user.id);
      expect(meta.courseId).toBe(course.id);
    });
  });

  describe('contact notification email', () => {
    const originalAdminEmail = process.env.ADMIN_EMAIL;
    const submission = {
      username: 'Contact Person',
      track: 'Backend',
      email: 'bg-contact@example.com',
      phone: '+201000000000',
      message: 'Hello from the background tests',
    };

    beforeEach(() => {
      process.env.ADMIN_EMAIL = 'admin@trosc.club';
    });

    afterEach(() => {
      process.env.ADMIN_EMAIL = originalAdminEmail;
    });

    it('responds even when the send never resolves', async () => {
      const send = jest.spyOn(Email.prototype, 'send').mockImplementation(hang);

      const res = await request(app).post('/v1/contact').send(submission);

      expect(res.status).toBe(200);
      expect(send).toHaveBeenCalledTimes(1);
      expect(await Contact.findOne({ email: submission.email })).not.toBeNull();
    });

    it('logs a failed send without the message body', async () => {
      jest
        .spyOn(Email.prototype, 'send')
        .mockRejectedValue(new Error('SMTP unreachable'));
      const errorLog = jest.spyOn(logger, 'error').mockImplementation(() => {});

      const res = await request(app).post('/v1/contact').send(submission);

      expect(res.status).toBe(200);
      await waitFor(() =>
        errorLog.mock.calls.some(
          ([message]) => message === 'Contact form notification email failed',
        ),
      );
      const [, meta] = errorLog.mock.calls.find(
        ([message]) => message === 'Contact form notification email failed',
      );
      expect(Object.keys(meta).sort()).toEqual(['contactId', 'error']);
      expect(JSON.stringify(meta)).not.toContain(submission.message);
    });
  });

  describe('password reset email stays awaited', () => {
    it('fails with 500 and clears the token when the send fails', async () => {
      const { user } = await createTestUser({ email: 'bg-reset@example.com' });
      jest
        .spyOn(Email.prototype, 'sendPasswordReset')
        .mockRejectedValue(new Error('SMTP unreachable'));

      const res = await request(app)
        .post('/v1/users/forgotPassword')
        .send({ email: user.email });

      expect(res.status).toBe(500);
      const refreshed = await User.findById(user._id).select(
        '+passwordResetToken +passwordResetExpires',
      );
      expect(refreshed.passwordResetToken).toBeUndefined();
      expect(refreshed.passwordResetExpires).toBeUndefined();
    });

    it('waits for the send: a hanging send keeps the request open', async () => {
      const { user } = await createTestUser({ email: 'bg-reset2@example.com' });
      jest.spyOn(Email.prototype, 'sendPasswordReset').mockImplementation(hang);

      const outcome = await Promise.race([
        authService.forgotPassword(user.email).then(() => 'finished'),
        new Promise((resolve) => {
          setTimeout(() => resolve('still waiting'), 300);
        }),
      ]);

      expect(outcome).toBe('still waiting');
    });
  });
});

describe('audit log is written in the background', () => {
  it('signup still ends up with its audit row', async () => {
    const res = await request(app)
      .post('/v1/users/signup')
      .send(signupBody('bg-audit@example.com'));
    expect(res.status).toBe(201);

    const row = await waitFor(() =>
      ActivityLog.findOne({
        user: res.body.data.user._id,
        action: 'signed_up',
      }),
    );
    expect(row).not.toBeNull();
  });
});
