# Testing Guide (Jest + Supertest)

A practical guide to the concepts behind the test setup in this repo, written for someone who hasn't used Jest or Supertest before.

## The two tools, in plain terms

**Jest** is the _test runner and assertion library_. It's what gives you `describe`, `it`, and `expect`, runs your test files, and tells you what passed/failed. You never `require('jest')` in your code — Jest injects those functions globally when it runs your files.

**Supertest** is a library that lets you send fake HTTP requests directly at your Express `app` object — no real server, no real port, no actual network call. It's what gives you `request(app).post('/v1/contact').send({...})`. Under the hood it spins up your Express app on a random ephemeral port for the duration of that one request, then tears it down — you never have to call `app.listen()` yourself in tests.

Together: Jest runs the test and checks results, Supertest is _how you make the request_ that produces those results.

## Why `server.js` and `src/app.js` being separate matters

This project already has the right shape for testing, which is why none of this required restructuring your code:

- `src/app.js` builds the Express app and does `module.exports = app` — no `.listen()` call.
- `server.js` is the only place that calls `app.listen()`, and it's also the only place that calls `db.config.js` to connect to a real MongoDB.

That separation means a test file can `require('../src/app')` and get a fully-configured Express app — routes, middleware, error handling, all of it — without starting a real server or touching your real database. If `app.listen()` lived inside `app.js`, importing it for tests would start a real server as a side effect every time, which is exactly what you don't want.

## The moving pieces in this repo

```
jest.config.js              — tells Jest where tests live and what setup to run
.env.test                   — test-only env vars (fake JWT secret, etc.)
tests/
  globalSetup.js            — runs ONCE before any test file: starts an
                               in-memory MongoDB, loads .env.test
  globalTeardown.js         — runs ONCE after all tests finish: stops
                               that in-memory MongoDB
  setupAfterEnv.js          — runs before/after each test FILE: connects
                               Mongoose, wipes collections between tests
  helpers/
    testUser.js             — creates a user directly in the DB + mints
                               a real JWT, skipping signup/email entirely
    fixtures.js             — shared track/course/session fixture builders,
                               used by reviews.test.js and assignments.test.js
  contact.test.js            — public contact form: submission + validation
  weeklyTask.test.js         — course-scoped weekly tasks: ownership, roles,
                               duplicate-week rejection, completion tracking
  reviews.test.js            — track/course/session review creation +
                               public listing
  assignments.test.js        — assignment listing, submission (including
                               untrusted-host rejection), resubmission
                               clearing a grade, and grading
  updateMe.test.js           — the base64 photo regression + enrolledTrack
                               presence
```

### Why an in-memory MongoDB instead of your real dev database?

`mongodb-memory-server` downloads a real MongoDB binary (once) and runs a real, throwaway MongoDB instance in memory for the duration of your test run. This matters for three reasons:

1. **Isolation** — tests can create/delete/mutate data freely without ever touching your actual dev data.
2. **Speed** — no network latency to Atlas; everything is local.
3. **Repeatability** — every test run starts from a genuinely empty database, so a test can never accidentally pass (or fail) because of leftover data from a previous run or another developer's local database.

The first time you run tests, it'll download the MongoDB binary — that needs an internet connection and takes a few seconds. After that it's cached locally and startup is fast.

## Anatomy of one test

```js
describe('POST /v1/contact', () => {
  it('accepts a valid submission and stores it', async () => {
    const res = await request(app).post('/v1/contact').send(validSubmission);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });
});
```

- `describe(...)` — groups related tests together. Purely organizational, shows up in the test output as a heading.
- `it(...)` (or its alias `test(...)`) — one actual test case. The string describes what should be true; the function body proves it.
- `request(app).post(...)` — Supertest builds an HTTP request against your app.
- `.send(...)` — attaches a JSON body (Supertest sets the right headers automatically).
- `expect(res.status).toBe(200)` — a Jest **assertion**. If `res.status` isn't `200`, the test fails right here and Jest reports it.

Common Jest matchers you'll use constantly: `.toBe(x)` (exact equality), `.toEqual(x)` (deep equality for objects/arrays), `.toBeNull()`, `.toHaveLength(n)`, `.not.toBe(x)`.

## Testing an authenticated route

Real signup goes through email verification, rate limiting, and password hashing — all real behavior you don't want to fight with in every single test. `tests/helpers/testUser.js` shortcuts this:

```js
const { createTestUser } = require('./helpers/testUser');

const { user, token } = await createTestUser({ role: 'instructor' });

const res = await request(app)
  .post(`/v1/courses/${course._id}/weekly-tasks`)
  .set('Authorization', `Bearer ${token}`)   // <-- this is the key part
  .send({ week: 1, title: 'Week 1', items: [...] });
```

It calls `User.create()` directly (so no signup endpoint, no rate limiter, no email sent) and signs a real JWT with your actual `generateToken` util — so the token is indistinguishable from one a real login would produce. `.set('Authorization', ...)` attaches it exactly like a real client would.

## Why fixtures are built with `Model.create()`, not through the API

`reviews.test.js`, `assignments.test.js`, and `weeklyTask.test.js` all build track/course/session setup directly via `Track.create()` / `Course.create()` / `Session.create()` rather than hitting the real creation endpoints. This is a deliberate and common pattern:

- **Speed** — no need to run through every layer of validation/middleware just to get data into place for a test that isn't _about_ track/course creation.
- **Focus** — if this test fails, you know it's about reviews/assignments/weekly-tasks, not accidentally exposing a bug in course creation.

The trade-off: none of these tests verify that track/course/session creation _itself_ works — that belongs in its own test file, testing that flow through the real endpoints.

### `tests/helpers/fixtures.js`

`reviews.test.js` and `assignments.test.js` share one fixture builder (`buildTrackAndCourseFixture`, `buildStandaloneSessionFixture`) instead of each defining their own — both needed the exact same shape (a track, a course inside it, an owning instructor, an unrelated instructor for ownership-rejection tests, and an enrolled student). `weeklyTask.test.js` still has its own local copy of a similar fixture, written before this shared helper existed; it works fine as-is, so it wasn't worth touching a passing file just for consistency's sake. If you add another test file needing the same shape, use the shared one rather than copy-pasting again.

## Running the tests

```bash
npm test              # run once
npm run test:watch    # re-run automatically as you edit files
npm run test:coverage # run once + generate a coverage report
```

`npm test` runs with `--runInBand`, meaning test files run one after another rather than in parallel. This project's tests share one in-memory MongoDB instance, so running them one at a time avoids test files stepping on each other's data mid-run. (Individual tests _within_ one file still run fast — this only serializes across files.)

### Running a specific test file

```bash
npm test -- tests/contact.test.js
```

Or if you want to watch only that file:

```bash
npm run test:watch -- tests/contact.test.js
```

### Test coverage

Coverage reports are generated in `coverage/lcov-report/index.html`. Open it in your browser to see which lines are covered. You can set a minimum coverage threshold by adding `--coverageThreshold` to the Jest config.

## Debugging tests

### Using Node inspector

```bash
node --inspect-brk node_modules/.bin/jest --runInBand tests/your-test.test.js
```

Then open `chrome://inspect` in Chrome and attach the debugger.

### Using `console.log`

Jest captures `console.log` output and shows it only for failed tests. You can also use `--verbose` to see all logs.

### Using the debugger statement

Add `debugger;` in your test or code, then run:

```bash
npm test -- --inspect-brk
```

## What's deliberately NOT covered yet

- **Email-sending code paths** — signup's welcome email, the contact form's admin notification, password reset — none of these are exercised in a way that actually sends mail (the contact test works specifically because `ADMIN_EMAIL` isn't set in `.env.test`, so that code path is skipped). If you write tests that need to touch those paths, you'll want to mock `src/utils/Email.js` rather than let it try to hit a real SMTP server — ask me when you get there.
- **File-upload/attachment validation** — untested so far, other than the assignment-submission trusted-host check in `assignments.test.js`.
- **Auth itself** — signup, login, password reset/change flows have no tests yet. Everything else here bypasses signup on purpose (via `createTestUser`), which means a real bug in `/signup` or `/login` wouldn't be caught by anything in this suite.
- **Assignment CRUD** — `PATCH`/`DELETE /v1/assignments/:id` (create is exercised only implicitly via the `Assignment.create()` fixtures in `assignments.test.js`, not through `POST /v1/{courses,sessions}/:id/assignments`).
- **Review deletion** — `DELETE` on a review isn't tested; only creation and listing are.
- **Contact admin endpoints** — `GET /v1/contact`, `GET /v1/contact/:id`, `PATCH /v1/contact/:id` (list/view/triage) have no tests; only the public `POST` does.
- **The `course`/`session` mutual-exclusivity validator on `Assignment`** — the model enforces exactly one of `course`/`session` must be set, but nothing tests that rejection directly.

## What's covered so far

| File | Covers |
|---|---|
| `contact.test.js` | Public contact form: success + every validation rejection |
| `weeklyTask.test.js` | Course-scoped weekly task creation (ownership, role, duplicate-week rejection) + per-student completion isolation |
| `reviews.test.js` | Course review creation (enrollment/duplicate/rating-range rejection), public listing, session-level review creation |
| `assignments.test.js` | Course + track assignment listing (`mySubmission`, enrollment gating, no submission-leakage), submission (including untrusted-host rejection), resubmission clearing a grade, grading (ownership-gated, 404-before-submission) |
| `updateMe.test.js` | The base64 photo regression (report item #4) + a normal-URL sanity check + garbage-input rejection + `enrolledTrack` presence (report item #8) |

## A good next test to write yourself

Session-level assignment CRUD, review deletion, and the contact admin endpoints are the biggest real gaps right now (see above) — any of those is a good next target. If you want something smaller to warm up on first, `PATCH /v1/assignments/:id` (update) is a good middle-difficulty step: auth + ownership like `weeklyTask.test.js`, but a simpler shape than the submission/grading flow in `assignments.test.js`.

## Writing your own tests: checklist

1. **Identify the endpoint** — is it public or protected? If protected, use `createTestUser` to get a token.
2. **Set up fixtures** — if the test needs data (e.g., a track, a course), create it directly with the model.
3. **Make the request** — use `request(app).method('/path')` and chain `.set()` for auth, `.send()` for body.
4. **Assert the response** — status code, body structure, and optionally verify database state.
5. **Clean up** — the database is cleared after each test automatically, so you don't need to manually delete data.
