const request = require('supertest');

const app = require('../../src/app');

const Track = require('../../src/models/track.model');

const { createTestUser } = require('../helpers/testUser');

describe('Track Controller – Missing Endpoints', () => {
  let instructor;
  let instructorToken;
  let otherInstructor;
  let otherInstructorToken;
  let adminToken;
  let student;
  let studentToken;
  let track;

  beforeEach(async () => {
    const instructorData = await createTestUser({ role: 'instructor' });
    instructor = instructorData.user;
    instructorToken = instructorData.token;

    const otherInstructorData = await createTestUser({
      role: 'instructor',
    });
    otherInstructor = otherInstructorData.user;
    otherInstructorToken = otherInstructorData.token;

    const adminData = await createTestUser({ role: 'admin' });
    adminToken = adminData.token;

    const studentData = await createTestUser({ role: 'student' });
    student = studentData.user;
    studentToken = studentData.token;
  });

  describe('Analytics', () => {
    beforeEach(async () => {
      track = await Track.create({
        title: 'Analytics Track',
        description: 'For testing analytics',
        instructor: instructor._id,
        students: [student._id],
        published: true,
      });
    });

    it('lets owning instructor see analytics', async () => {
      const res = await request(app)
        .get(`/v1/tracks/${track._id}/analytics`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.analytics.totalStudents).toBe(1);
    });

    it('lets admin see analytics', async () => {
      const res = await request(app)
        .get(`/v1/tracks/${track._id}/analytics`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('rejects a student (403)', async () => {
      const res = await request(app)
        .get(`/v1/tracks/${track._id}/analytics`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 if track not found', async () => {
      const fakeId = '507f1f77bcf86cd799439099';

      const res = await request(app)
        .get(`/v1/tracks/${fakeId}/analytics`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Pending Students', () => {
    beforeEach(async () => {
      track = await Track.create({
        title: 'Pending Track',
        description: 'For testing pending students',
        instructor: instructor._id,
        pendingStudents: [student._id],
        published: true,
      });
    });

    it('lets owning instructor see pending list', async () => {
      const res = await request(app)
        .get(`/v1/tracks/${track._id}/pending`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(1);
      expect(res.body.data.pendingStudents[0]._id).toBe(student._id.toString());
    });

    it('lets admin see pending list', async () => {
      const res = await request(app)
        .get(`/v1/tracks/${track._id}/pending`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('rejects a student (403)', async () => {
      const res = await request(app)
        .get(`/v1/tracks/${track._id}/pending`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Pending Leaves', () => {
    beforeEach(async () => {
      track = await Track.create({
        title: 'Leave Track',
        description: 'For testing pending leaves',
        instructor: instructor._id,
        students: [student._id],
        pendingLeaves: [student._id],
        published: true,
      });
    });

    it('lets owning instructor see pending leaves', async () => {
      const res = await request(app)
        .get(`/v1/tracks/${track._id}/leaves`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(1);
      expect(res.body.data.pendingLeaves[0]._id).toBe(student._id.toString());
    });

    it('lets admin see pending leaves', async () => {
      const res = await request(app)
        .get(`/v1/tracks/${track._id}/leaves`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('rejects a student (403)', async () => {
      const res = await request(app)
        .get(`/v1/tracks/${track._id}/leaves`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Approve/Reject Pending Students', () => {
    beforeEach(async () => {
      track = await Track.create({
        title: 'Approve Track',
        description: 'For testing approve/reject',
        instructor: instructor._id,
        pendingStudents: [student._id],
        published: true,
      });
    });

    it('approves pending student (owning instructor)', async () => {
      const res = await request(app)
        .post(`/v1/tracks/${track._id}/students/${student._id}/approve`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);

      const updatedTrack = await Track.findById(track._id);

      expect(updatedTrack.students.map((id) => id.toString())).toContain(
        student._id.toString(),
      );

      expect(
        updatedTrack.pendingStudents.map((id) => id.toString()),
      ).not.toContain(student._id.toString());
    });

    it('rejects if student not pending', async () => {
      await Track.findByIdAndUpdate(track._id, {
        $pull: {
          pendingStudents: student._id,
        },
      });

      const res = await request(app)
        .post(`/v1/tracks/${track._id}/students/${student._id}/approve`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(400);
    });

    it('rejects if instructor does not own the track', async () => {
      const res = await request(app)
        .post(`/v1/tracks/${track._id}/students/${student._id}/approve`)
        .set('Authorization', `Bearer ${otherInstructorToken}`);

      expect(res.status).toBe(403);
    });

    it('rejects self-approval (student trying to approve themselves)', async () => {
      const res = await request(app)
        .post(`/v1/tracks/${track._id}/students/${student._id}/approve`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('rejects pending student (owning instructor)', async () => {
      const res = await request(app)
        .post(`/v1/tracks/${track._id}/students/${student._id}/reject`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);

      const updatedTrack = await Track.findById(track._id);

      expect(
        updatedTrack.pendingStudents.map((id) => id.toString()),
      ).not.toContain(student._id.toString());
    });

    it('rejects if student not pending', async () => {
      await Track.findByIdAndUpdate(track._id, {
        $pull: {
          pendingStudents: student._id,
        },
      });

      const res = await request(app)
        .post(`/v1/tracks/${track._id}/students/${student._id}/reject`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('Approve/Reject Leave Requests', () => {
    beforeEach(async () => {
      track = await Track.create({
        title: 'Leave Approve Track',
        description: 'For testing leave approve/reject',
        instructor: instructor._id,
        students: [student._id],
        pendingLeaves: [student._id],
        published: true,
      });
    });

    it('approves leave request (owning instructor)', async () => {
      const res = await request(app)
        .post(`/v1/tracks/${track._id}/leaves/${student._id}/approve`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);

      const updatedTrack = await Track.findById(track._id);

      expect(updatedTrack.students.map((id) => id.toString())).not.toContain(
        student._id.toString(),
      );

      expect(
        updatedTrack.pendingLeaves.map((id) => id.toString()),
      ).not.toContain(student._id.toString());
    });

    it('rejects if no pending leave', async () => {
      await Track.findByIdAndUpdate(track._id, {
        $pull: {
          pendingLeaves: student._id,
        },
      });

      const res = await request(app)
        .post(`/v1/tracks/${track._id}/leaves/${student._id}/approve`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(400);
    });

    it('rejects if instructor does not own the track', async () => {
      const res = await request(app)
        .post(`/v1/tracks/${track._id}/leaves/${student._id}/approve`)
        .set('Authorization', `Bearer ${otherInstructorToken}`);

      expect(res.status).toBe(403);
    });

    it('rejects self-approval (student trying to approve their own leave)', async () => {
      const res = await request(app)
        .post(`/v1/tracks/${track._id}/leaves/${student._id}/approve`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('rejects leave request (owning instructor)', async () => {
      const res = await request(app)
        .post(`/v1/tracks/${track._id}/leaves/${student._id}/reject`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);

      const updatedTrack = await Track.findById(track._id);

      expect(
        updatedTrack.pendingLeaves.map((id) => id.toString()),
      ).not.toContain(student._id.toString());

      expect(updatedTrack.students.map((id) => id.toString())).toContain(
        student._id.toString(),
      );
    });

    it('rejects if no pending leave', async () => {
      await Track.findByIdAndUpdate(track._id, {
        $pull: {
          pendingLeaves: student._id,
        },
      });

      const res = await request(app)
        .post(`/v1/tracks/${track._id}/leaves/${student._id}/reject`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(400);
    });
  });
});
