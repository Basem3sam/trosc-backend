const request = require('supertest');
const app = require('../src/app');
const Contact = require('../src/models/contact.model');

// This is the simplest kind of test in this project: a public endpoint,
// no auth, no fixtures. Good first file to read if you're new to this
// test suite — see TESTING.md for the concepts behind each part.

describe('POST /v1/contact', () => {
  const validSubmission = {
    username: 'Basem Esam',
    track: 'Backend Development',
    email: 'basem@example.com',
    phone: '+201234567890',
    message: 'I would like to know more about the upcoming cohort.',
  };

  it('accepts a valid submission and stores it', async () => {
    const res = await request(app).post('/v1/contact').send(validSubmission);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');

    // Confirm it actually landed in the DB, not just a happy HTTP response.
    const stored = await Contact.findOne({ email: validSubmission.email });
    expect(stored).not.toBeNull();
    expect(stored.username).toBe(validSubmission.username);
    expect(stored.status).toBe('new');
  });

  it('rejects a submission missing a required field', async () => {
    const { message, ...incomplete } = validSubmission;

    const res = await request(app).post('/v1/contact').send(incomplete);

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('fail');

    const stored = await Contact.findOne({ email: validSubmission.email });
    expect(stored).toBeNull();
  });

  it('rejects an invalid email format', async () => {
    const res = await request(app)
      .post('/v1/contact')
      .send({ ...validSubmission, email: 'not-an-email' });

    expect(res.status).toBe(400);
  });

  it('rejects a message under 10 characters', async () => {
    const res = await request(app)
      .post('/v1/contact')
      .send({ ...validSubmission, message: 'too short' });

    expect(res.status).toBe(400);
  });

  it('rejects an invalid phone number format', async () => {
    const res = await request(app)
      .post('/v1/contact')
      .send({ ...validSubmission, phone: 'not a phone number at all' });

    expect(res.status).toBe(400);
  });
});
