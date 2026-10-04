const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Session = require('../src/models/session.model');
const { protect, optionalAuth } = require('../src/middlewares/auth.middleware');
const { createTestUser } = require('./helpers/testUser');
const { startQueryCount } = require('./helpers/queryCounter');

const PHOTO_URL = 'https://res.cloudinary.com/demo/user.jpg';

// Runs an Express middleware to completion and resolves with whatever it
// passed to next() (undefined on success, an error otherwise).
const run = (middleware, req) =>
  new Promise((resolve) => {
    middleware(req, {}, resolve);
  });

const bearer = (token) => ({ headers: { authorization: `Bearer ${token}` } });

describe('auth lookup - one user read per request', () => {
  let counter;

  afterEach(() => {
    // Always switch the Mongoose debug hook off, even if a test failed
    // before reaching its own stop() call.
    if (counter) counter.stop();
    counter = null;
    jest.restoreAllMocks();
  });

  it('protect reads the user once on a plain protected route', async () => {
    const { token } = await createTestUser();
    counter = startQueryCount();

    const res = await request(app)
      .get('/v1/events/my-events')
      .set('Authorization', `Bearer ${token}`);

    counter.stop();
    expect(res.status).toBe(200);
    expect(counter.count('users', 'findOne')).toBe(1);
  });

  it('reads the user once where optionalAuth runs after protect (GET /v1/sessions)', async () => {
    const { token } = await createTestUser();
    counter = startQueryCount();

    const res = await request(app)
      .get('/v1/sessions')
      .set('Authorization', `Bearer ${token}`);

    counter.stop();
    expect(res.status).toBe(200);
    expect(counter.count('users', 'findOne')).toBe(1);
  });

  it('reads the user once where only optionalAuth runs (GET /v1/announcements)', async () => {
    const { token } = await createTestUser();
    counter = startQueryCount();

    const res = await request(app)
      .get('/v1/announcements')
      .set('Authorization', `Bearer ${token}`);

    counter.stop();
    expect(res.status).toBe(200);
    expect(counter.count('users', 'findOne')).toBe(1);
  });

  it('protect then protect: the second call skips the token and the read', async () => {
    const { user, token } = await createTestUser();
    const findById = jest.spyOn(User, 'findById');
    const req = bearer(token);

    expect(await run(protect, req)).toBeUndefined();
    const firstUser = req.user;
    expect(await run(protect, req)).toBeUndefined();

    expect(findById).toHaveBeenCalledTimes(1);
    expect(req.user).toBe(firstUser);
    expect(req.user.id).toBe(user.id);
  });

  it('protect then optionalAuth: optionalAuth skips the read', async () => {
    const { token } = await createTestUser();
    const findById = jest.spyOn(User, 'findById');
    const req = bearer(token);

    await run(protect, req);
    await run(optionalAuth, req);

    expect(findById).toHaveBeenCalledTimes(1);
  });

  it('optionalAuth then protect: protect skips the read', async () => {
    const { user, token } = await createTestUser();
    const findById = jest.spyOn(User, 'findById');
    const req = bearer(token);

    await run(optionalAuth, req);
    expect(await run(protect, req)).toBeUndefined();

    expect(findById).toHaveBeenCalledTimes(1);
    expect(req.user.id).toBe(user.id);
  });

  it('protect still rejects when nothing authenticated the request earlier', async () => {
    const err = await run(protect, { headers: {} });
    expect(err.statusCode).toBe(401);
  });

  it('a deactivated user is still rejected after the change', async () => {
    const { user, token } = await createTestUser();
    await User.findByIdAndUpdate(user._id, { active: false });

    const err = await run(protect, bearer(token));
    expect(err.statusCode).toBe(401);

    // optionalAuth treats the same token as anonymous.
    const req = bearer(token);
    await run(optionalAuth, req);
    expect(req.user).toBeUndefined();
  });
});

describe('auth lookup - photo is not loaded', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('req.user.photo is undefined after protect, other fields are intact', async () => {
    const { user, token } = await createTestUser({ photo: PHOTO_URL });
    // Sanity check: the photo really is stored.
    const stored = await User.findById(user._id);
    expect(stored.photo).toBe(PHOTO_URL);

    const req = bearer(token);
    await run(protect, req);

    expect(req.user.photo).toBeUndefined();
    expect(req.user.id).toBe(user.id);
    expect(req.user.role).toBe('student');
    expect(req.user.active).toBe(true);
  });

  it('req.user.photo is undefined after optionalAuth', async () => {
    const { token } = await createTestUser({ photo: PHOTO_URL });

    const req = bearer(token);
    await run(optionalAuth, req);

    expect(req.user).toBeDefined();
    expect(req.user.photo).toBeUndefined();
  });

  it('GET /v1/users/me still returns the photo', async () => {
    const { token } = await createTestUser({ photo: PHOTO_URL });

    const res = await request(app)
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.photo).toBe(PHOTO_URL);
  });

  it('PATCH /v1/users/me still returns the photo', async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ photo: PHOTO_URL });

    expect(res.status).toBe(200);
    expect(res.body.data.user.photo).toBe(PHOTO_URL);
  });

  it('GET /v1/users/:id (admin) still returns the photo', async () => {
    const { token: adminToken } = await createTestUser({ role: 'admin' });
    const { user } = await createTestUser({ photo: PHOTO_URL });

    const res = await request(app)
      .get(`/v1/users/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.photo).toBe(PHOTO_URL);
  });
});

describe('GET /v1/users/me - response and query count', () => {
  let counter;

  afterEach(() => {
    if (counter) counter.stop();
    counter = null;
  });

  it('returns exactly what the previous implementation returned', async () => {
    const { user, token } = await createTestUser({ photo: PHOTO_URL });

    // What getMe produced before this change: the full user document minus
    // the password, plus pendingTrack.
    const doc = await User.findById(user._id).select('-password');
    const before = doc.toObject();
    before.pendingTrack = null;
    const expected = JSON.parse(JSON.stringify(before));

    const res = await request(app)
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user).toEqual(expected);
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.user.active).toBeUndefined();
    expect(res.body.data.user.passwordChangedAt).toBeUndefined();
  });

  it('issues no more reads than before: protect, getMe and the pending-track lookup', async () => {
    const { token } = await createTestUser();
    counter = startQueryCount();

    const res = await request(app)
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${token}`);

    counter.stop();
    expect(res.status).toBe(200);
    // 1 from protect + 1 from getMe (it needs `photo`, which protect no
    // longer loads) = 2, the same as before. The pending-track lookup now
    // runs alongside the getMe read instead of after it.
    expect(counter.count('users', 'findOne')).toBe(2);
    expect(counter.count('tracks', 'findOne')).toBe(1);
  });
});

describe('GET /v1/sessions - populate removed, response unchanged', () => {
  let counter;

  afterEach(() => {
    if (counter) counter.stop();
    counter = null;
  });

  const buildSession = async () => {
    const { user: instructor } = await createTestUser({ role: 'instructor' });
    const { user: enrolled, token: enrolledToken } = await createTestUser();
    const { user: other } = await createTestUser();
    const { token: outsiderToken } = await createTestUser();

    const session = await Session.create({
      title: 'Intro Webinar',
      instructor: instructor._id,
      url: 'https://drive.google.com/file/d/abc',
      resources: [{ title: 'res', url: 'https://drive.google.com/file/d/xyz' }],
      students: [enrolled._id, other._id],
      published: true,
    });

    return { instructor, session, enrolledToken, outsiderToken };
  };

  it('keeps isEnrolled, studentCount and the redactions for an enrolled student', async () => {
    const { session, enrolledToken } = await buildSession();

    const res = await request(app)
      .get('/v1/sessions')
      .set('Authorization', `Bearer ${enrolledToken}`);

    expect(res.status).toBe(200);
    const item = res.body.data.sessions.find((s) => s._id === session.id);
    expect(item.isEnrolled).toBe(true);
    expect(item.studentCount).toBe(2);
    expect(item.students).toBeUndefined();
    expect(item.progress).toBeUndefined();
    expect(item.url).toBe('https://drive.google.com/file/d/abc');
    expect(item.instructor.role).toBe('instructor');
  });

  it('keeps isEnrolled false and hides url/resources for an outsider', async () => {
    const { session, outsiderToken } = await buildSession();

    const res = await request(app)
      .get('/v1/sessions')
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(res.status).toBe(200);
    const item = res.body.data.sessions.find((s) => s._id === session.id);
    expect(item.isEnrolled).toBe(false);
    expect(item.studentCount).toBe(2);
    expect(item.students).toBeUndefined();
    expect(item.url).toBeUndefined();
    expect(item.embedUrl).toBeUndefined();
    expect(item.resources).toBeUndefined();
  });

  it('no longer runs a second users query for the roster', async () => {
    const { outsiderToken } = await buildSession();
    counter = startQueryCount();

    const res = await request(app)
      .get('/v1/sessions')
      .set('Authorization', `Bearer ${outsiderToken}`);

    counter.stop();
    expect(res.status).toBe(200);
    // Only the instructor populate reads `users` with find(); the
    // students populate that used to add a second one is gone.
    expect(counter.count('users', 'find')).toBe(1);
  });
});

describe('POST /v1/users/bulk - userIds cap', () => {
  let adminToken;

  beforeEach(async () => {
    ({ token: adminToken } = await createTestUser({ role: 'admin' }));
  });

  const fakeIds = (n) =>
    Array.from({ length: n }, () => new mongoose.Types.ObjectId().toString());

  it('accepts exactly 100 ids', async () => {
    const res = await request(app)
      .post('/v1/users/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userIds: fakeIds(100), action: 'deactivate' });

    expect(res.status).toBe(200);
  });

  it('rejects 101 ids with 400 and a clear message', async () => {
    const res = await request(app)
      .post('/v1/users/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userIds: fakeIds(101), action: 'deactivate' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      'You can act on at most 100 users per request',
    );
  });
});
