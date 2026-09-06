const request = require('supertest');
const app = require('../src/app');
const Track = require('../src/models/track.model');
const Course = require('../src/models/course.model');
const { createTestUser } = require('./helpers/testUser');

// A fixture bundle: one track, one course inside it (owned by `instructor`),
// with `student` enrolled in the course. Built directly against the models
// (not through the real signup/create endpoints) because this test is about
// weekly tasks, not about auth or course creation — see TESTING.md for why.
async function buildCourseFixture() {
  const { user: instructor, token: instructorToken } = await createTestUser({
    role: 'instructor',
  });
  const { user: otherInstructor, token: otherInstructorToken } =
    await createTestUser({ role: 'instructor' });
  const { user: student, token: studentToken } = await createTestUser({
    role: 'student',
  });

  const track = await Track.create({
    title: 'Backend Track',
    description: 'Learn backend development',
    instructor: instructor._id,
  });

  const course = await Course.create({
    title: 'Node.js Fundamentals',
    description: 'Intro to Node.js',
    instructor: instructor._id,
    track: track._id,
    students: [student._id],
  });

  await Track.findByIdAndUpdate(track._id, {
    $addToSet: { courses: course._id },
  });

  return {
    instructor,
    instructorToken,
    otherInstructor,
    otherInstructorToken,
    student,
    studentToken,
    track,
    course,
  };
}

describe('Weekly Tasks', () => {
  describe('POST /v1/courses/:id/weekly-tasks', () => {
    it('lets the owning instructor create a weekly task', async () => {
      const { course, instructorToken } = await buildCourseFixture();

      const res = await request(app)
        .post(`/v1/courses/${course._id}/weekly-tasks`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          week: 1,
          title: 'Week 1: Setup',
          items: [
            { title: 'Install Node.js', type: 'reading' },
            { title: 'Set up your first server', type: 'other' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.task.week).toBe(1);
      expect(res.body.data.task.items).toHaveLength(2);
    });

    it('rejects an instructor who does not own the course', async () => {
      const { course, otherInstructorToken } = await buildCourseFixture();

      const res = await request(app)
        .post(`/v1/courses/${course._id}/weekly-tasks`)
        .set('Authorization', `Bearer ${otherInstructorToken}`)
        .send({ week: 1, title: 'Week 1', items: [{ title: 'Read this' }] });

      expect(res.status).toBe(403);
    });

    it('rejects a student', async () => {
      const { course, studentToken } = await buildCourseFixture();

      const res = await request(app)
        .post(`/v1/courses/${course._id}/weekly-tasks`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ week: 1, title: 'Week 1', items: [{ title: 'Read this' }] });

      expect(res.status).toBe(403);
    });

    it('rejects a duplicate week number for the same course', async () => {
      const { course, instructorToken } = await buildCourseFixture();
      const body = { week: 1, title: 'Week 1', items: [{ title: 'Read' }] };

      await request(app)
        .post(`/v1/courses/${course._id}/weekly-tasks`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send(body);

      const res = await request(app)
        .post(`/v1/courses/${course._id}/weekly-tasks`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send(body);

      expect(res.status).toBe(400);
    });
  });

  describe('completion tracking', () => {
    it('reflects a student marking an item done, and only for that student', async () => {
      const fixture = await buildCourseFixture();
      const { course, instructor, instructorToken, student, studentToken } =
        fixture;

      const createRes = await request(app)
        .post(`/v1/courses/${course._id}/weekly-tasks`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          week: 1,
          title: 'Week 1',
          items: [{ title: 'Read Chapter 1', type: 'reading' }],
        });

      const taskId = createRes.body.data.task._id;
      const itemId = createRes.body.data.task.items[0]._id;

      // Before completing: the item should show done: false
      const beforeRes = await request(app)
        .get(`/v1/courses/${course._id}/weekly-tasks`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(beforeRes.body.data.tasks[0].items[0].done).toBe(false);

      // Student marks it done
      const completeRes = await request(app)
        .post(`/v1/weekly-tasks/${taskId}/items/${itemId}/complete`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(completeRes.status).toBe(200);

      // Now it should show done: true for the student...
      const afterRes = await request(app)
        .get(`/v1/courses/${course._id}/weekly-tasks`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(afterRes.body.data.tasks[0].items[0].done).toBe(true);

      // ...but the instructor's own completion state is unaffected
      // (they haven't completed anything themselves).
      const instructorView = await request(app)
        .get(`/v1/courses/${course._id}/weekly-tasks`)
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(instructorView.body.data.tasks[0].items[0].done).toBe(false);
    });
  });
});
