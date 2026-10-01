const request = require('supertest');
const app = require('../src/app');
const Assignment = require('../src/models/assignment.model');
const trustedHosts = require('../src/utils/trustedHosts');
const {
  trustedHostMessage,
  TRUSTED_HOSTS_LIST,
} = require('../src/utils/trustedHostsMessage');
const { buildTrackAndCourseFixture } = require('./helpers/fixtures');

// BACKEND-REQUESTS-2 #3.1 + Decisions Q1: submissions are LINKS, not file
// uploads. The behavior was already link-only; what was wrong was that a
// multipart upload surfaced as the confusing '"file" is required', and the
// "trusted host" error text hand-listed hosts that drifted from the real
// allowlist. Both now come from the single source of truth.
describe('Submissions are links only (#3.1)', () => {
  async function buildAssignment() {
    const fixture = await buildTrackAndCourseFixture();
    const assignment = await Assignment.create({
      title: 'Build a REST API',
      description: 'Create a full CRUD API',
      instructor: fixture.instructor._id,
      course: fixture.course._id,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    return { ...fixture, assignment };
  }

  const submit = (assignment, token) =>
    request(app)
      .post(`/v1/assignments/${assignment._id}/submissions`)
      .set('Authorization', `Bearer ${token}`);

  it('still accepts a trusted-host https link as JSON', async () => {
    const { assignment, studentToken } = await buildAssignment();

    const res = await submit(assignment, studentToken).send({
      file: 'https://drive.google.com/file/d/abc123/view',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.submission.file).toBe(
      'https://drive.google.com/file/d/abc123/view',
    );
  });

  it('rejects a multipart file upload with a message that says links only', async () => {
    const { assignment, studentToken } = await buildAssignment();

    const res = await submit(assignment, studentToken).attach(
      'file',
      Buffer.from('%PDF-1.4 fake pdf'),
      'homework.pdf',
    );

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/links, not file uploads/i);
    expect(res.body.message).toContain('GET /v1/config/trusted-hosts');
    // the old, confusing text is gone
    expect(res.body.message).not.toBe('"file" is required');
  });

  it('explains a missing file the same way', async () => {
    const { assignment, studentToken } = await buildAssignment();

    const res = await submit(assignment, studentToken).send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/links, not file uploads/i);
  });

  it('says so when file is not a string or not a URL', async () => {
    const { assignment, studentToken } = await buildAssignment();

    const notString = await submit(assignment, studentToken).send({
      file: { name: 'homework.pdf' },
    });
    expect(notString.status).toBe(400);
    expect(notString.body.message).toMatch(/must be a link/i);

    const notUrl = await submit(assignment, studentToken).send({
      file: 'homework.pdf',
    });
    expect(notUrl.status).toBe(400);
    expect(notUrl.body.message).toMatch(/must be a link/i);
  });

  it('lists EVERY allowed host in the untrusted-host error, straight from the real list', async () => {
    const { assignment, studentToken } = await buildAssignment();

    const res = await submit(assignment, studentToken).send({
      file: 'https://evil.example.com/homework.pdf',
    });

    expect(res.status).toBe(400);
    trustedHosts.forEach((host) => {
      expect(res.body.message).toContain(host);
    });
  });
});

describe('trustedHostMessage (single source of truth for the error text)', () => {
  it('lists every host in trustedHosts.js', () => {
    const message = trustedHostMessage('Attachment');
    trustedHosts.forEach((host) => expect(message).toContain(host));
    expect(TRUSTED_HOSTS_LIST).toBe(trustedHosts.join(', '));
  });

  it('keeps the phrase existing clients/tests match on', () => {
    expect(trustedHostMessage('Attachment')).toMatch(
      /^Attachment must be a valid HTTPS URL from a trusted host/,
    );
  });

  it('points at the config endpoint', () => {
    expect(trustedHostMessage('Session URL')).toContain(
      'GET /v1/config/trusted-hosts',
    );
  });
});
