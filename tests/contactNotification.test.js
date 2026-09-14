const request = require('supertest');
const app = require('../src/app');
const Contact = require('../src/models/contact.model');
const Email = require('../src/utils/Email'); // jest-mocked globally (see setupAfterEnv.js)
const { createTestUser } = require('./helpers/testUser');

const validSubmission = {
  username: 'Basem Esam',
  track: 'Backend Development',
  email: 'notify-basem@example.com',
  phone: '+201234567890',
  message: 'I would like to know more about the upcoming cohort.',
};

describe('POST /v1/contact — admin notification email', () => {
  const originalAdminEmail = process.env.ADMIN_EMAIL;

  afterEach(() => {
    process.env.ADMIN_EMAIL = originalAdminEmail;
  });

  it('still stores the submission and succeeds when the notification email sends fine', async () => {
    process.env.ADMIN_EMAIL = 'admin@trosc.club';

    const res = await request(app).post('/v1/contact').send(validSubmission);

    expect(res.status).toBe(200);
    const stored = await Contact.findOne({ email: validSubmission.email });
    expect(stored).not.toBeNull();
  });

  it('still stores the submission and succeeds even if the notification email fails to send', async () => {
    process.env.ADMIN_EMAIL = 'admin@trosc.club';

    const sendSpy = jest
      .spyOn(Email.prototype, 'send')
      .mockRejectedValueOnce(new Error('SMTP unreachable'));

    const res = await request(app)
      .post('/v1/contact')
      .send({ ...validSubmission, email: 'notify-fail@example.com' });

    expect(res.status).toBe(200);
    const stored = await Contact.findOne({ email: 'notify-fail@example.com' });
    expect(stored).not.toBeNull();

    sendSpy.mockRestore();
  });
});

describe('PATCH /v1/contact/:id — not found', () => {
  it('returns 404 when updating the status of a non-existent submission', async () => {
    const { token: adminToken } = await createTestUser({ role: 'admin' });
    const fakeId = '507f1f77bcf86cd799439099';

    const res = await request(app)
      .patch(`/v1/contact/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'read' });

    expect(res.status).toBe(404);
  });
});
