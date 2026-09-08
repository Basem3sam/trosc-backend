const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/user.model');

// Auth itself — signup, login, and the fields those endpoints are trusted
// not to leak or let a caller override. Every other test file in this
// suite deliberately bypasses these two endpoints via createTestUser(),
// so this is the only place that actually exercises them end-to-end.

describe('POST /v1/users/signup', () => {
  const validSignup = {
    name: 'Basem Esam',
    email: 'signup-basem@example.com',
    password: 'Password123!',
    passwordConfirm: 'Password123!',
  };

  it('creates a user and returns a token + cookie', async () => {
    const res = await request(app).post('/v1/users/signup').send(validSignup);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.data.user.email).toBe(validSignup.email);

    // The 'jwt' cookie should be set, httpOnly.
    const setCookie = res.headers['set-cookie'] || [];
    expect(setCookie.some((c) => c.startsWith('jwt='))).toBe(true);
    expect(setCookie.some((c) => /httponly/i.test(c))).toBe(true);
  });

  it('never returns the password hash in the response', async () => {
    const res = await request(app)
      .post('/v1/users/signup')
      .send({ ...validSignup, email: 'signup-nopass@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('persists the user with a hashed (not plaintext) password', async () => {
    await request(app)
      .post('/v1/users/signup')
      .send({ ...validSignup, email: 'signup-hash@example.com' });

    const stored = await User.findOne({
      email: 'signup-hash@example.com',
    }).select('+password');

    expect(stored).not.toBeNull();
    expect(stored.password).not.toBe(validSignup.password);
    // bcrypt hashes start with $2a$/$2b$/$2y$
    expect(stored.password).toMatch(/^\$2[aby]\$/);
  });

  it('defaults role to student even if the caller sends role: admin', async () => {
    const res = await request(app)
      .post('/v1/users/signup')
      .send({
        ...validSignup,
        email: 'signup-roleinjection@example.com',
        role: 'admin',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('student');

    const stored = await User.findOne({
      email: 'signup-roleinjection@example.com',
    });
    expect(stored.role).toBe('student');
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/v1/users/signup').send(validSignup);

    const res = await request(app).post('/v1/users/signup').send(validSignup);

    expect(res.status).toBe(409);
    expect(res.body.status).toBe('fail');

    const count = await User.countDocuments({ email: validSignup.email });
    expect(count).toBe(1);
  });

  it('rejects mismatched password confirmation', async () => {
    const res = await request(app)
      .post('/v1/users/signup')
      .send({
        ...validSignup,
        email: 'signup-mismatch@example.com',
        passwordConfirm: 'SomethingElse123!',
      });

    expect(res.status).toBe(400);

    const stored = await User.findOne({
      email: 'signup-mismatch@example.com',
    });
    expect(stored).toBeNull();
  });

  it('rejects a password shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/v1/users/signup')
      .send({
        ...validSignup,
        email: 'signup-shortpass@example.com',
        password: 'short1',
        passwordConfirm: 'short1',
      });

    expect(res.status).toBe(400);
  });

  it('rejects an invalid email format', async () => {
    const res = await request(app)
      .post('/v1/users/signup')
      .send({ ...validSignup, email: 'not-an-email' });

    expect(res.status).toBe(400);
  });

  it('rejects a missing name', async () => {
    const { name, ...withoutName } = validSignup;

    const res = await request(app)
      .post('/v1/users/signup')
      .send({ ...withoutName, email: 'signup-noname@example.com' });

    expect(res.status).toBe(400);
  });
});

describe('POST /v1/users/login', () => {
  const credentials = {
    email: 'login-basem@example.com',
    password: 'Password123!',
  };

  beforeEach(async () => {
    await User.create({
      name: 'Basem Esam',
      email: credentials.email,
      password: credentials.password,
      passwordConfirm: credentials.password,
    });
  });

  it('logs in with correct credentials and returns a token + cookie', async () => {
    const res = await request(app).post('/v1/users/login').send(credentials);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.data.user.email).toBe(credentials.email);
    expect(res.body.data.user.password).toBeUndefined();

    const setCookie = res.headers['set-cookie'] || [];
    expect(setCookie.some((c) => c.startsWith('jwt='))).toBe(true);
  });

  it('updates lastLogin on successful login', async () => {
    const before = await User.findOne({ email: credentials.email });
    expect(before.lastLogin).toBeNull();

    await request(app).post('/v1/users/login').send(credentials);

    const after = await User.findOne({ email: credentials.email });
    expect(after.lastLogin).not.toBeNull();
  });

  it('rejects an incorrect password with 401', async () => {
    const res = await request(app)
      .post('/v1/users/login')
      .send({ ...credentials, password: 'WrongPassword1!' });

    expect(res.status).toBe(401);
  });

  it('rejects a non-existent email with 401 (not a 404)', async () => {
    const res = await request(app)
      .post('/v1/users/login')
      .send({ email: 'nobody-here@example.com', password: 'Password123!' });

    expect(res.status).toBe(401);
  });

  it('gives the same 401 for wrong password and unknown email (no user enumeration)', async () => {
    const wrongPassword = await request(app)
      .post('/v1/users/login')
      .send({ ...credentials, password: 'WrongPassword1!' });

    const unknownEmail = await request(app)
      .post('/v1/users/login')
      .send({ email: 'nobody-here@example.com', password: 'Password123!' });

    expect(wrongPassword.status).toBe(unknownEmail.status);
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  it('rejects a login for a deactivated account', async () => {
    await User.findOneAndUpdate(
      { email: credentials.email },
      { active: false },
    );

    const res = await request(app).post('/v1/users/login').send(credentials);

    expect(res.status).toBe(401);
  });

  it('rejects a missing password', async () => {
    const res = await request(app)
      .post('/v1/users/login')
      .send({ email: credentials.email });

    expect(res.status).toBe(400);
  });

  it('rejects a missing email', async () => {
    const res = await request(app)
      .post('/v1/users/login')
      .send({ password: credentials.password });

    expect(res.status).toBe(400);
  });
});

describe('POST /v1/users/logout', () => {
  let credentials;

  beforeEach(async () => {
    credentials = {
      email: 'logout-user@example.com',
      password: 'Password123!',
    };
    await request(app)
      .post('/v1/users/signup')
      .send({
        name: 'Logout User',
        ...credentials,
        passwordConfirm: credentials.password,
      });
  });

  it('logs out and clears the cookie', async () => {
    const loginRes = await request(app)
      .post('/v1/users/login')
      .send(credentials);
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    const logoutRes = await request(app)
      .post('/v1/users/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);
    const cookie = logoutRes.headers['set-cookie']?.find((c) =>
      c.startsWith('jwt='),
    );
    expect(cookie).toMatch(/Expires=/i); // cookie expires quickly
  });
});
