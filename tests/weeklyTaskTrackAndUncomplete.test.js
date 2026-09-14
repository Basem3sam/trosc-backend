const request = require('supertest');
const app = require('../src/app');
const Track = require('../src/models/track.model');
const Course = require('../src/models/course.model');
const { createTestUser } = require('./helpers/testUser');

async function buildCourseFixture() {
  const { user: instructor, token: instructorToken } = await createTestUser({
    role: 'instructor',
  });
  const { user: student, token: studentToken } = await createTestUser({
    role: 'student',
  });

  const track = await Track.create({
    title: 'Weekly Task Track',
    description: 'Track for weekly task aggregate tests',
    instructor: instructor._id,
    students: [student._id],
  });

  const course = await Course.create({
    title: 'Weekly Task Course',
    description: 'Course inside the track',
    instructor: instructor._id,
    track: track._id,
    students: [student._id],
  });

  await Track.findByIdAndUpdate(track._id, {
    $addToSet: { courses: course._id },
  });

  return { instructor, instructorToken, student, studentToken, track, course };
}

describe('GET /v1/tracks/:id/weekly-tasks (aggregate across courses)', () => {
  it('returns weekly tasks across every course in the track for an enrolled student', async () => {
    const { track, course, instructorToken, studentToken } =
      await buildCourseFixture();

    await request(app)
      .post(`/v1/courses/${course._id}/weekly-tasks`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        week: 1,
        title: 'Week 1: Track Aggregate',
        items: [{ title: 'Read intro', type: 'reading' }],
      });

    const res = await request(app)
      .get(`/v1/tracks/${track._id}/weekly-tasks`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.results).toBeGreaterThanOrEqual(1);
    expect(res.body.data.tasks[0].title).toBe('Week 1: Track Aggregate');
  });

  it('rejects a student who is not enrolled in the track', async () => {
    const { track } = await buildCourseFixture();
    const { token: outsiderToken } = await createTestUser({
      role: 'student',
    });

    const res = await request(app)
      .get(`/v1/tracks/${track._id}/weekly-tasks`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
  });
});

describe('DELETE /v1/weekly-tasks/:taskId/items/:itemId/complete (uncomplete)', () => {
  it('lets an enrolled student unmark a completed item', async () => {
    const { course, instructorToken, studentToken } =
      await buildCourseFixture();

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

    await request(app)
      .post(`/v1/weekly-tasks/${taskId}/items/${itemId}/complete`)
      .set('Authorization', `Bearer ${studentToken}`);

    const res = await request(app)
      .delete(`/v1/weekly-tasks/${taskId}/items/${itemId}/complete`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Item marked as incomplete');

    const afterRes = await request(app)
      .get(`/v1/courses/${course._id}/weekly-tasks`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(afterRes.body.data.tasks[0].items[0].done).toBe(false);
  });
});
