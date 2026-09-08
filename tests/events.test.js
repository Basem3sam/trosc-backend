const request = require('supertest');
const app = require('../src/app');
const Event = require('../src/models/event.model');
const { createTestUser } = require('./helpers/testUser');

describe('Events CRUD & RSVP', () => {
  let adminToken, instructorToken, studentToken, studentId;

  beforeEach(async () => {
    const admin = await createTestUser({ role: 'admin' });
    adminToken = admin.token;
    const instructor = await createTestUser({ role: 'instructor' });
    instructorToken = instructor.token;
    const student = await createTestUser({ role: 'student' });
    studentToken = student.token;
    studentId = student.user._id; // store the actual user ID
  });

  describe('CRUD Operations', () => {
    let eventId;

    // Create a fresh event before each CRUD test
    beforeEach(async () => {
      const res = await request(app)
        .post('/v1/events')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Tech Talk',
          description: 'A talk on Node.js',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          locationType: 'online',
          locationLink: 'https://zoom.us/meeting/123',
        });
      eventId = res.body.data.event._id;
    });

    it('instructor can create an event', async () => {
      const res = await request(app)
        .post('/v1/events')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Another Event',
          description: 'Another talk',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          locationType: 'online',
          locationLink: 'https://zoom.us/meeting/456',
        });
      expect(res.status).toBe(201);
    });

    it('admin can create an event', async () => {
      const res = await request(app)
        .post('/v1/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Admin Event',
          description: 'Admin created',
          date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          locationType: 'offline',
          locationAddress: 'Room 101',
        });
      expect(res.status).toBe(201);
    });

    it('student cannot create an event', async () => {
      const res = await request(app)
        .post('/v1/events')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Student Event',
          description: 'Should fail',
          date: new Date().toISOString(),
          locationType: 'online',
        });
      expect(res.status).toBe(403);
    });

    it('GET /v1/events returns list (public)', async () => {
      const res = await request(app).get('/v1/events');
      expect(res.status).toBe(200);
      expect(res.body.results).toBeGreaterThan(0);
    });

    it('GET /v1/events/:id returns event details', async () => {
      const res = await request(app).get(`/v1/events/${eventId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.event.title).toBe('Tech Talk');
    });

    it('instructor can update their own event', async () => {
      const res = await request(app)
        .patch(`/v1/events/${eventId}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ title: 'Updated Tech Talk' });
      expect(res.status).toBe(200);
      expect(res.body.data.event.title).toBe('Updated Tech Talk');
    });

    it('admin can update any event', async () => {
      const res = await request(app)
        .patch(`/v1/events/${eventId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Updated description' });
      expect(res.status).toBe(200);
    });

    it('instructor can delete their own event', async () => {
      const delRes = await request(app)
        .delete(`/v1/events/${eventId}`)
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(delRes.status).toBe(204);
    });
  });

  describe('RSVP', () => {
    let rsvpEventId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/v1/events')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'RSVP Test Event',
          description: 'For RSVP testing',
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          locationType: 'online',
          locationLink: 'https://zoom.us/meeting/456',
        });
      rsvpEventId = res.body.data.event._id;
    });

    it('student can RSVP to an event', async () => {
      const res = await request(app)
        .post(`/v1/events/${rsvpEventId}/rsvp`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      const event = await Event.findById(rsvpEventId);
      expect(event.attendees.map((id) => id.toString())).toContain(
        studentId.toString(),
      );
    });

    it('student cannot RSVP twice', async () => {
      await request(app)
        .post(`/v1/events/${rsvpEventId}/rsvp`)
        .set('Authorization', `Bearer ${studentToken}`);
      const res = await request(app)
        .post(`/v1/events/${rsvpEventId}/rsvp`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(400);
    });

    it('student can cancel RSVP', async () => {
      await request(app)
        .post(`/v1/events/${rsvpEventId}/rsvp`)
        .set('Authorization', `Bearer ${studentToken}`);
      const res = await request(app)
        .delete(`/v1/events/${rsvpEventId}/rsvp`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      const event = await Event.findById(rsvpEventId);
      expect(event.attendees).not.toContainEqual(studentId);
    });

    it('GET /v1/events/my-events returns user RSVPs', async () => {
      await request(app)
        .post(`/v1/events/${rsvpEventId}/rsvp`)
        .set('Authorization', `Bearer ${studentToken}`);
      const res = await request(app)
        .get('/v1/events/my-events')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.results).toBe(1);
    });
  });
});
