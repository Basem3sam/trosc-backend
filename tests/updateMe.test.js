const request = require('supertest');
const app = require('../src/app');
const { createTestUser } = require('./helpers/testUser');

// Regression test for a bug from the original gap-analysis report:
// User.photo's Mongoose-level validator rejected base64 data URIs, so
// PATCH /v1/users/updateMe returned 400 on every avatar upload from the
// dashboard (which always sends a base64 string, not a URL). Joi's own
// photoValidation already accepted base64 — the bug was specifically in
// the schema-level `validate` function, which still runs here because
// userService.updateMe calls findByIdAndUpdate with runValidators: true.
describe('PATCH /v1/users/updateMe', () => {
  it('accepts a base64 photo (the original bug this guards against)', async () => {
    const { token } = await createTestUser();
    const base64Photo =
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAA=';

    const res = await request(app)
      .patch('/v1/users/updateMe')
      .set('Authorization', `Bearer ${token}`)
      .send({ photo: base64Photo });

    expect(res.status).toBe(200);
    expect(res.body.data.user.photo).toBe(base64Photo);
  });

  it('still accepts a normal photo URL', async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .patch('/v1/users/updateMe')
      .set('Authorization', `Bearer ${token}`)
      .send({ photo: 'https://res.cloudinary.com/demo/user.jpg' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.photo).toBe(
      'https://res.cloudinary.com/demo/user.jpg',
    );
  });

  it('still rejects garbage input that is not a URL, filename, or base64 image', async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .patch('/v1/users/updateMe')
      .set('Authorization', `Bearer ${token}`)
      .send({ photo: 'not a photo at all' });

    expect(res.status).toBe(400);
  });

  it('returns enrolledTrack in the response (report item #8)', async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .patch('/v1/users/updateMe')
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: 'Backend developer' });

    expect(res.status).toBe(200);
    expect(res.body.data.user).toHaveProperty('enrolledTrack');
  });
});
