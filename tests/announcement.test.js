const request = require('supertest');
const app = require('../src/app');
const { createTestUser } = require('./helpers/testUser');

describe('Announcements CRUD', () => {
  let adminToken;
  let instructorToken;
  let studentToken;
  let announcementId;

  beforeEach(async () => {
    const admin = await createTestUser({ role: 'admin' });
    adminToken = admin.token;
    const instructor = await createTestUser({ role: 'instructor' });
    instructorToken = instructor.token;
    const student = await createTestUser({ role: 'student' });
    studentToken = student.token;

    // Create a base announcement for GET/update/delete tests
    const res = await request(app)
      .post('/v1/announcements')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'Important Update',
        message: 'This is a test announcement.',
        isPinned: true,
      });
    if (res.status === 201) {
      announcementId = res.body.data.announcement._id;
    }
  });

  it('instructor can create an announcement', async () => {
    const res = await request(app)
      .post('/v1/announcements')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'Another Announcement',
        message: 'This is another test.',
        isPinned: false,
      });
    expect(res.status).toBe(201);
  });

  it('admin can create an announcement', async () => {
    const res = await request(app)
      .post('/v1/announcements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Admin Announcement',
        message: 'From admin',
        isPinned: false,
      });
    expect(res.status).toBe(201);
  });

  it('student cannot create an announcement', async () => {
    const res = await request(app)
      .post('/v1/announcements')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Student Announcement',
        message: 'Should fail',
      });
    expect(res.status).toBe(403);
  });

  it('GET /v1/announcements returns list (public)', async () => {
    const res = await request(app).get('/v1/announcements');
    expect(res.status).toBe(200);
    expect(res.body.results).toBeGreaterThan(0);
  });

  it('GET /v1/announcements/:id returns single', async () => {
    const res = await request(app).get(`/v1/announcements/${announcementId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.announcement.title).toBe('Important Update');
  });

  it('instructor can update their own announcement', async () => {
    const res = await request(app)
      .patch(`/v1/announcements/${announcementId}`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ message: 'Updated message' });
    expect(res.status).toBe(200);
    expect(res.body.data.announcement.message).toBe('Updated message');
  });

  it('admin can update any announcement', async () => {
    const res = await request(app)
      .patch(`/v1/announcements/${announcementId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isPinned: false });
    expect(res.status).toBe(200);
  });

  it('instructor can delete their own announcement', async () => {
    const res = await request(app)
      .delete(`/v1/announcements/${announcementId}`)
      .set('Authorization', `Bearer ${instructorToken}`);
    expect(res.status).toBe(204);
  });
});
