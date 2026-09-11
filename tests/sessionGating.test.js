const request = require('supertest');
const app = require('../src/app');
const Session = require('../src/models/session.model');
const { createTestUser } = require('./helpers/testUser');
const { buildTrackAndCourseFixture } = require('./helpers/fixtures');

describe('Session URL Gating', () => {
  let session;
  let studentToken;
  let outsiderToken;
  let course;

  beforeEach(async () => {
    const fixture = await buildTrackAndCourseFixture();
    course = fixture.course;
    studentToken = fixture.studentToken;
    const { token: oToken } = await createTestUser({ role: 'student' });
    outsiderToken = oToken;

    // Use a standard YouTube URL that triggers embed generation
    const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    session = await Session.create({
      title: 'Private Session',
      url: youtubeUrl,
      instructor: fixture.instructor._id,
      course: course._id,
      students: [fixture.student._id],
    });
  });

  it('strips url/embedUrl/resources for non-enrolled users', async () => {
    const res = await request(app)
      .get(`/v1/sessions/${session._id}`)
      .set('Authorization', `Bearer ${outsiderToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.session.url).toBeUndefined();
    expect(res.body.data.session.embedUrl).toBeUndefined();
    expect(res.body.data.session.resources).toBeUndefined();
  });

  it('shows url/embedUrl/resources for enrolled student', async () => {
    const res = await request(app)
      .get(`/v1/sessions/${session._id}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.session.url).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    );
    expect(res.body.data.session.embedUrl).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    );
    // Resources are returned as an array (even if empty) for enrolled users.
    expect(res.body.data.session.resources).toEqual([]);
  });
});
