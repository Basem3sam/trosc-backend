const request = require('supertest');
const app = require('../../src/app');
const WeeklyTask = require('../../src/models/weeklytask.model');
const { createTestUser } = require('../helpers/testUser');
const { buildTrackAndCourseFixture } = require('../helpers/fixtures');

describe('WeeklyTask Controller – Update and Delete', () => {
  let instructor;
  let instructorToken;
  let adminToken;
  let otherInstructorToken;
  let studentToken;
  let course;
  let task;

  beforeEach(async () => {
    const fixture = await buildTrackAndCourseFixture();
    instructor = fixture.instructor;
    instructorToken = fixture.instructorToken;
    otherInstructorToken = fixture.otherInstructorToken;
    adminToken = (await createTestUser({ role: 'admin' })).token;
    studentToken = fixture.studentToken;
    course = fixture.course;

    task = await WeeklyTask.create({
      course: course._id,
      instructor: instructor._id,
      week: 1,
      title: 'Week 1: Setup',
      items: [
        { title: 'Read Chapter 1', type: 'reading' },
        { title: 'Install Node.js', type: 'other' },
      ],
    });
  });

  describe('PATCH /v1/weekly-tasks/:taskId', () => {
    it('lets the owning instructor update the weekly task', async () => {
      const res = await request(app)
        .patch(`/v1/weekly-tasks/${task._id}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          week: 2,
          title: 'Week 2: Advanced',
          items: [
            { _id: task.items[0]._id, title: 'Updated Chapter 1' },
            { title: 'New Item: Build a server' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.task.week).toBe(2);
      expect(res.body.data.task.title).toBe('Week 2: Advanced');
      expect(res.body.data.task.items).toHaveLength(2);
      expect(res.body.data.task.items[0].title).toBe('Updated Chapter 1');
      expect(res.body.data.task.items[1].title).toBe(
        'New Item: Build a server',
      );
    });

    it('lets admin update any weekly task', async () => {
      const res = await request(app)
        .patch(`/v1/weekly-tasks/${task._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Admin Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.data.task.title).toBe('Admin Updated Title');
    });

    it('rejects an instructor who does not own the task', async () => {
      const res = await request(app)
        .patch(`/v1/weekly-tasks/${task._id}`)
        .set('Authorization', `Bearer ${otherInstructorToken}`)
        .send({ title: 'Hijacked' });

      expect(res.status).toBe(403);
    });

    it('rejects a student', async () => {
      const res = await request(app)
        .patch(`/v1/weekly-tasks/${task._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Student Attempt' });

      expect(res.status).toBe(403);
    });

    it('returns 400 if week clashes with another task in the same course', async () => {
      // Create another task with week 2
      await WeeklyTask.create({
        course: course._id,
        instructor: instructor._id,
        week: 2,
        title: 'Week 2',
        items: [{ title: 'Something' }],
      });

      const res = await request(app)
        .patch(`/v1/weekly-tasks/${task._id}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ week: 2 });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Week 2 already has a weekly task/i);
    });

    it('returns 400 if no fields provided', async () => {
      const res = await request(app)
        .patch(`/v1/weekly-tasks/${task._id}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 404 if task not found', async () => {
      const fakeId = '507f1f77bcf86cd799439099';
      const res = await request(app)
        .patch(`/v1/weekly-tasks/${fakeId}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ title: 'Does not exist' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /v1/weekly-tasks/:taskId', () => {
    it('lets the owning instructor delete the weekly task', async () => {
      const res = await request(app)
        .delete(`/v1/weekly-tasks/${task._id}`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(204);
      const deleted = await WeeklyTask.findById(task._id);
      expect(deleted).toBeNull();
    });

    it('lets admin delete any weekly task', async () => {
      const res = await request(app)
        .delete(`/v1/weekly-tasks/${task._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);
    });

    it('rejects an instructor who does not own the task', async () => {
      const res = await request(app)
        .delete(`/v1/weekly-tasks/${task._id}`)
        .set('Authorization', `Bearer ${otherInstructorToken}`);

      expect(res.status).toBe(403);
    });

    it('rejects a student', async () => {
      const res = await request(app)
        .delete(`/v1/weekly-tasks/${task._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 if task not found', async () => {
      const fakeId = '507f1f77bcf86cd799439099';
      const res = await request(app)
        .delete(`/v1/weekly-tasks/${fakeId}`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(404);
    });
  });
});
