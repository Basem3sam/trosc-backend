const request = require('supertest');
const app = require('../../src/app');
const Track = require('../../src/models/track.model');
const { createTestUser } = require('../helpers/testUser');

describe('selfApproval middleware', () => {
  it('rejects an instructor attempting to approve their own studentId', async () => {
    const { user: instructor, token: instructorToken } = await createTestUser({
      role: 'instructor',
    });

    const track = await Track.create({
      title: 'Self Approval Track',
      description: 'For selfApproval middleware coverage',
      instructor: instructor._id,
      pendingStudents: [instructor._id],
    });

    const res = await request(app)
      .post(`/v1/tracks/${track._id}/students/${instructor._id}/approve`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/cannot approve your own request/);
  });
});
