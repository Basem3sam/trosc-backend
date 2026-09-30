const request = require('supertest');
const app = require('../src/app');
const Assignment = require('../src/models/assignment.model');
const WeeklyTask = require('../src/models/weeklytask.model');
const { buildTrackAndCourseFixture } = require('./helpers/fixtures');

// Decisions.md Q6: `createdBy` is set once, at creation, and is pure
// historical attribution — it must never be settable by the client, and
// must never be read by any authorization check (that's still
// `instructor`, unchanged by this stage).
describe('createdBy attribution (Q6)', () => {
  describe('Assignment', () => {
    it('sets createdBy to the caller on create', async () => {
      const fixture = await buildTrackAndCourseFixture();

      const res = await request(app)
        .post(`/v1/courses/${fixture.course._id}/assignments`)
        .set('Authorization', `Bearer ${fixture.instructorToken}`)
        .send({
          title: 'Build a REST API',
          description: 'Create a full CRUD API',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

      expect(res.status).toBe(201);
      expect(res.body.data.assignment.createdBy).toBe(
        fixture.instructor._id.toString(),
      );
      expect(res.body.data.assignment.instructor).toBe(
        fixture.instructor._id.toString(),
      );
    });

    it("rejects a client-supplied createdBy outright — this app's Joi validation has no allowlisted field for it, and rejects unknown body keys rather than silently stripping them", async () => {
      const fixture = await buildTrackAndCourseFixture();

      const res = await request(app)
        .post(`/v1/courses/${fixture.course._id}/assignments`)
        .set('Authorization', `Bearer ${fixture.instructorToken}`)
        .send({
          title: 'Build a REST API',
          description: 'Create a full CRUD API',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdBy: fixture.otherInstructor._id.toString(),
        });

      expect(res.status).toBe(400);
    });

    it('does not require createdBy at the model level — existing (pre-migration) records stay valid', async () => {
      const fixture = await buildTrackAndCourseFixture();

      const legacyAssignment = await Assignment.create({
        title: 'Pre-existing Assignment',
        description: 'Created before createdBy existed',
        course: fixture.course._id,
        instructor: fixture.instructor._id,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(legacyAssignment.createdBy).toBeUndefined();
    });
  });

  describe('WeeklyTask', () => {
    it('sets createdBy to the caller on create', async () => {
      const fixture = await buildTrackAndCourseFixture();

      const res = await request(app)
        .post(`/v1/courses/${fixture.course._id}/weekly-tasks`)
        .set('Authorization', `Bearer ${fixture.instructorToken}`)
        .send({
          week: 1,
          title: 'Week 1: Setup',
          items: [{ title: 'Install Node.js', type: 'reading' }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.task.createdBy).toBe(
        fixture.instructor._id.toString(),
      );
      expect(res.body.data.task.instructor).toBe(
        fixture.instructor._id.toString(),
      );
    });

    it('does not require createdBy at the model level', async () => {
      const fixture = await buildTrackAndCourseFixture();

      const legacyTask = await WeeklyTask.create({
        course: fixture.course._id,
        instructor: fixture.instructor._id,
        week: 1,
        title: 'Pre-existing Week',
      });

      expect(legacyTask.createdBy).toBeUndefined();
    });
  });
});
