const request = require('supertest');
const app = require('../src/app');
const Track = require('../src/models/track.model');
const Course = require('../src/models/course.model');
const Session = require('../src/models/session.model');
const { createTestUser } = require('./helpers/testUser');

describe('Track Endpoints (Missing Coverage)', () => {
  describe('GET /v1/tracks/popular', () => {
    it('returns tracks sorted by student count (published only)', async () => {
      const instructor = await createTestUser({ role: 'instructor' });

      // Create track with 2 students
      const track1 = await Track.create({
        title: 'Popular Track',
        description: 'Lots of students',
        instructor: instructor.user._id,
        published: true,
        students: [instructor.user._id], // count = 1
      });

      // Create track with 0 students (should NOT appear)
      const track2 = await Track.create({
        title: 'Empty Track',
        description: 'No students',
        instructor: instructor.user._id,
        published: true,
        students: [],
      });

      // Create unpublished track with students (should NOT appear)
      const track3 = await Track.create({
        title: 'Hidden Track',
        description: 'Unpublished',
        instructor: instructor.user._id,
        published: false,
        students: [instructor.user._id],
      });

      const res = await request(app).get('/v1/tracks/popular?limit=5');

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(1);
      expect(res.body.data.tracks[0]._id).toBe(String(track1._id));
      expect(res.body.data.tracks[0].studentCount).toBe(1);
    });
  });

  describe('GET /v1/tracks/:id/analytics', () => {
    it('rejects a student (403)', async () => {
      const instructor = await createTestUser({ role: 'instructor' });
      const student = await createTestUser({ role: 'student' });

      const track = await Track.create({
        title: 'Analytics Track',
        description: 'For testing',
        instructor: instructor.user._id,
        published: true,
      });

      const res = await request(app)
        .get(`/v1/tracks/${track._id}/analytics`)
        .set('Authorization', `Bearer ${student.token}`);

      expect(res.status).toBe(403);
    });

    it('lets the owning instructor see analytics', async () => {
      const instructor = await createTestUser({ role: 'instructor' });

      const track = await Track.create({
        title: 'Analytics Track',
        description: 'For testing',
        instructor: instructor.user._id,
        published: true,
        students: [instructor.user._id],
      });

      const res = await request(app)
        .get(`/v1/tracks/${track._id}/analytics`)
        .set('Authorization', `Bearer ${instructor.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.analytics.totalStudents).toBe(1);
      expect(res.body.data.analytics.totalSessions).toBe(0);
    });
  });

  describe('GET /v1/tracks/:id/pending', () => {
    it('rejects a student (403)', async () => {
      const instructor = await createTestUser({ role: 'instructor' });
      const student = await createTestUser({ role: 'student' });

      const track = await Track.create({
        title: 'Pending Track',
        description: 'For testing',
        instructor: instructor.user._id,
        pendingStudents: [student.user._id],
      });

      const res = await request(app)
        .get(`/v1/tracks/${track._id}/pending`)
        .set('Authorization', `Bearer ${student.token}`);

      expect(res.status).toBe(403);
    });

    it('lets the owning instructor see pending list', async () => {
      const instructor = await createTestUser({ role: 'instructor' });
      const student = await createTestUser({ role: 'student' });

      const track = await Track.create({
        title: 'Pending Track',
        description: 'For testing',
        instructor: instructor.user._id,
        pendingStudents: [student.user._id],
      });

      const res = await request(app)
        .get(`/v1/tracks/${track._id}/pending`)
        .set('Authorization', `Bearer ${instructor.token}`);

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(1);
      expect(res.body.data.pendingStudents[0]._id).toBe(
        String(student.user._id),
      );
    });
  });

  describe('Leave requests (GET/POST)', () => {
    let instructor, student, track, studentId;

    beforeEach(async () => {
      instructor = await createTestUser({ role: 'instructor' });
      student = await createTestUser({ role: 'student' });
      studentId = student.user._id.toString();

      track = await Track.create({
        title: 'Leave Test Track',
        description: 'For testing leave flows',
        instructor: instructor.user._id,
        students: [student.user._id],
      });
    });

    it('GET /v1/tracks/:id/leaves returns pending leaves (instructor only)', async () => {
      // Student requests to leave
      await request(app)
        .post(`/v1/tracks/${track._id}/leave-me`)
        .set('Authorization', `Bearer ${student.token}`);

      const res = await request(app)
        .get(`/v1/tracks/${track._id}/leaves`)
        .set('Authorization', `Bearer ${instructor.token}`);

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(1);
      expect(res.body.data.pendingLeaves[0]._id).toBe(String(student.user._id));
    });

    it('POST /v1/tracks/:id/leaves/:studentId/approve (instructor only)', async () => {
      // Add student to pendingLeaves
      await Track.findByIdAndUpdate(track._id, {
        $push: { pendingLeaves: student.user._id },
      });

      const res = await request(app)
        .post(`/v1/tracks/${track._id}/leaves/${studentId}/approve`)
        .set('Authorization', `Bearer ${instructor.token}`);

      expect(res.status).toBe(200);

      const updatedTrack = await Track.findById(track._id);
      expect(updatedTrack.students.map((id) => id.toString())).not.toContain(
        studentId,
      );
      expect(updatedTrack.pendingLeaves).toHaveLength(0);
    });

    it('POST /v1/tracks/:id/leaves/:studentId/reject (instructor only)', async () => {
      await Track.findByIdAndUpdate(track._id, {
        $push: { pendingLeaves: student.user._id },
      });

      const res = await request(app)
        .post(`/v1/tracks/${track._id}/leaves/${studentId}/reject`)
        .set('Authorization', `Bearer ${instructor.token}`);

      expect(res.status).toBe(200);

      const updatedTrack = await Track.findById(track._id);
      expect(updatedTrack.students.map((id) => id.toString())).toContain(
        studentId,
      );
      expect(updatedTrack.pendingLeaves).toHaveLength(0);
    });

    it('self-approval is blocked (403)', async () => {
      await Track.findByIdAndUpdate(track._id, {
        $push: { pendingLeaves: student.user._id },
      });

      const res = await request(app)
        .post(`/v1/tracks/${track._id}/leaves/${studentId}/approve`)
        .set('Authorization', `Bearer ${student.token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /v1/tracks/student/:studentId', () => {
    it('lets a student see their own enrolled tracks', async () => {
      const instructor = await createTestUser({ role: 'instructor' });
      const student = await createTestUser({ role: 'student' });

      const track = await Track.create({
        title: 'My Track',
        description: 'Student enrolled',
        instructor: instructor.user._id,
        students: [student.user._id],
        published: true,
      });

      const res = await request(app)
        .get(`/v1/tracks/student/${student.user._id}`)
        .set('Authorization', `Bearer ${student.token}`);

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(1);
      expect(res.body.data.tracks[0]._id).toBe(String(track._id));
    });

    it("prevents a student from seeing another student's enrollments (403)", async () => {
      const instructor = await createTestUser({ role: 'instructor' });
      const student1 = await createTestUser({ role: 'student' });
      const student2 = await createTestUser({ role: 'student' });

      await Track.create({
        title: 'Track A',
        description: 'Student 1 only',
        instructor: instructor.user._id,
        students: [student1.user._id],
      });

      const res = await request(app)
        .get(`/v1/tracks/student/${student1.user._id}`)
        .set('Authorization', `Bearer ${student2.token}`);

      expect(res.status).toBe(403);
    });
  });
});
