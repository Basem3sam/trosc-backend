const mongoose = require('mongoose');
const weeklyTaskService = require('../../src/services/weeklyTask.service');
const Track = require('../../src/models/track.model');
const Course = require('../../src/models/course.model');
const WeeklyTask = require('../../src/models/weeklytask.model');
const { createTestUser } = require('../helpers/testUser');

describe('WeeklyTask Service', () => {
  let instructor;
  let student;
  let otherInstructor;
  let course;

  beforeEach(async () => {
    instructor = (await createTestUser({ role: 'instructor' })).user;
    otherInstructor = (await createTestUser({ role: 'instructor' })).user;
    student = (await createTestUser({ role: 'student' })).user;
    course = await Course.create({
      title: 'Course',
      description: 'test',
      instructor: instructor._id,
      students: [student._id],
      published: true,
    });
  });

  describe('createWeeklyTask', () => {
    it('creates a weekly task', async () => {
      const task = await weeklyTaskService.createWeeklyTask(
        course._id,
        instructor._id,
        {
          week: 1,
          title: 'Week 1',
          items: [{ title: 'Read', type: 'reading' }],
        },
      );
      expect(task.week).toBe(1);
      expect(task.items).toHaveLength(1);
    });

    it('throws 400 if week already exists', async () => {
      await weeklyTaskService.createWeeklyTask(course._id, instructor._id, {
        week: 1,
        title: 'Week 1',
        items: [{ title: 'Read' }],
      });
      await expect(
        weeklyTaskService.createWeeklyTask(course._id, instructor._id, {
          week: 1,
          title: 'Week 1 again',
          items: [{ title: 'Read again' }],
        }),
      ).rejects.toThrow('Week 1 already has a weekly task');
    });
  });

  describe('getCourseWeeklyTasks / getTrackWeeklyTasks', () => {
    it('returns tasks with done flags for student', async () => {
      const task = await WeeklyTask.create({
        course: course._id,
        instructor: instructor._id,
        week: 1,
        title: 'Week 1',
        items: [{ title: 'Item 1' }, { title: 'Item 2' }],
      });
      const itemId = task.items[0]._id.toString();
      await WeeklyTask.updateOne(
        { _id: task._id },
        { $push: { completions: { student: student._id, item: itemId } } },
      );

      const tasks = await weeklyTaskService.getCourseWeeklyTasks(course._id, {
        id: student._id.toString(),
        role: 'student',
      });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].items[0].done).toBe(true);
      expect(tasks[0].items[1].done).toBe(false);
    });

    it('throws 403 if student not enrolled in course', async () => {
      const outsider = (await createTestUser({ role: 'student' })).user;
      await expect(
        weeklyTaskService.getCourseWeeklyTasks(course._id, {
          id: outsider._id.toString(),
          role: 'student',
        }),
      ).rejects.toThrow(
        "Only enrolled students can view this course's weekly tasks",
      );
    });

    it('throws 404 if course/track not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        weeklyTaskService.getCourseWeeklyTasks(fakeId, {
          id: student._id.toString(),
          role: 'student',
        }),
      ).rejects.toThrow('No course found');
      await expect(
        weeklyTaskService.getTrackWeeklyTasks(fakeId, {
          id: student._id.toString(),
          role: 'student',
        }),
      ).rejects.toThrow('No track found');
    });

    it('aggregates tasks across courses in a track', async () => {
      const track = await Track.create({
        title: 'Track',
        description: 'test',
        instructor: instructor._id,
        students: [student._id],
      });
      const course2 = await Course.create({
        title: 'Course2',
        description: 'test',
        instructor: instructor._id,
        track: track._id,
        students: [student._id],
        published: true,
      });
      track.courses.push(course._id, course2._id);
      await track.save();

      await WeeklyTask.create({
        course: course._id,
        instructor: instructor._id,
        week: 1,
        title: 'Week 1',
        items: [{ title: 'A' }],
      });
      await WeeklyTask.create({
        course: course2._id,
        instructor: instructor._id,
        week: 1,
        title: 'Week 1 (2)',
        items: [{ title: 'B' }],
      });

      const tasks = await weeklyTaskService.getTrackWeeklyTasks(track._id, {
        id: student._id.toString(),
        role: 'student',
      });
      expect(tasks).toHaveLength(2);
    });
  });

  describe('updateWeeklyTask', () => {
    it('updates week, title, and items preserving completions', async () => {
      const task = await WeeklyTask.create({
        course: course._id,
        instructor: instructor._id,
        week: 1,
        title: 'Old Title',
        items: [{ title: 'Old Item 1' }, { title: 'Old Item 2' }],
      });
      const oldItemId = task.items[0]._id.toString();
      await WeeklyTask.updateOne(
        { _id: task._id },
        { $push: { completions: { student: student._id, item: oldItemId } } },
      );

      const updated = await weeklyTaskService.updateWeeklyTask(task._id, {
        week: 2,
        title: 'New Title',
        items: [
          { _id: oldItemId, title: 'Updated Old Item 1' },
          { title: 'Brand New Item' },
        ],
      });
      expect(updated.week).toBe(2);
      expect(updated.title).toBe('New Title');
      expect(updated.items).toHaveLength(2);
      expect(updated.items[0].title).toBe('Updated Old Item 1');
      const savedTask = await WeeklyTask.findById(task._id);
      expect(savedTask.completions).toHaveLength(1);
      expect(savedTask.completions[0].item.toString()).toBe(
        oldItemId.toString(),
      );
    });

    it('throws 400 if new week clashes with another task in same course', async () => {
      await WeeklyTask.create({
        course: course._id,
        instructor: instructor._id,
        week: 1,
        title: 'Week 1',
        items: [{ title: 'A' }],
      });
      const task2 = await WeeklyTask.create({
        course: course._id,
        instructor: instructor._id,
        week: 2,
        title: 'Week 2',
        items: [{ title: 'B' }],
      });
      await expect(
        weeklyTaskService.updateWeeklyTask(task2._id, { week: 1 }),
      ).rejects.toThrow('Week 1 already has a weekly task');
    });

    it('removes orphaned completions when items are deleted', async () => {
      const task = await WeeklyTask.create({
        course: course._id,
        instructor: instructor._id,
        week: 1,
        title: 'Week 1',
        items: [{ title: 'A' }, { title: 'B' }],
      });
      const itemA = task.items[0]._id.toString();
      const itemB = task.items[1]._id.toString();
      await WeeklyTask.updateOne(
        { _id: task._id },
        { $push: { completions: { student: student._id, item: itemA } } },
      );
      await WeeklyTask.updateOne(
        { _id: task._id },
        { $push: { completions: { student: student._id, item: itemB } } },
      );

      await weeklyTaskService.updateWeeklyTask(task._id, {
        items: [{ _id: itemA, title: 'A' }],
      });
      const saved = await WeeklyTask.findById(task._id);
      expect(saved.completions).toHaveLength(1);
      expect(saved.completions[0].item.toString()).toBe(itemA.toString());
    });
  });

  describe('deleteWeeklyTask', () => {
    it('deletes task and completions', async () => {
      const task = await WeeklyTask.create({
        course: course._id,
        instructor: instructor._id,
        week: 1,
        title: 'Week 1',
        items: [{ title: 'A' }],
        completions: [
          { student: student._id, item: new mongoose.Types.ObjectId() },
        ],
      });
      await weeklyTaskService.deleteWeeklyTask(task._id);
      expect(await WeeklyTask.findById(task._id)).toBeNull();
    });
  });

  describe('setItemCompletion', () => {
    it('marks item as completed for student', async () => {
      const task = await WeeklyTask.create({
        course: course._id,
        instructor: instructor._id,
        week: 1,
        title: 'Week 1',
        items: [{ title: 'A' }],
      });
      const itemId = task.items[0]._id.toString();
      await weeklyTaskService.setItemCompletion(
        task._id,
        itemId,
        { id: student._id.toString(), role: 'student' },
        true,
      );
      const saved = await WeeklyTask.findById(task._id);
      expect(saved.completions).toHaveLength(1);
      expect(saved.completions[0].student.toString()).toBe(
        student._id.toString(),
      );
      expect(saved.completions[0].item.toString()).toBe(itemId);
    });

    it('unmarks item as completed', async () => {
      const task = await WeeklyTask.create({
        course: course._id,
        instructor: instructor._id,
        week: 1,
        title: 'Week 1',
        items: [{ title: 'A' }],
      });
      const itemId = task.items[0]._id.toString();
      // Add completion
      await WeeklyTask.updateOne(
        { _id: task._id },
        { $push: { completions: { student: student._id, item: itemId } } },
      );
      await weeklyTaskService.setItemCompletion(
        task._id,
        itemId,
        { id: student._id.toString(), role: 'student' },
        false,
      );
      const saved = await WeeklyTask.findById(task._id);
      expect(saved.completions).toHaveLength(0);
    });

    it('throws 404 if item not found', async () => {
      const task = await WeeklyTask.create({
        course: course._id,
        instructor: instructor._id,
        week: 1,
        title: 'Week 1',
        items: [{ title: 'A' }],
      });
      const fakeItemId = new mongoose.Types.ObjectId().toString();
      await expect(
        weeklyTaskService.setItemCompletion(
          task._id,
          fakeItemId,
          { id: student._id.toString(), role: 'student' },
          true,
        ),
      ).rejects.toThrow('No item found with that ID');
    });

    it('throws 403 if student not enrolled', async () => {
      const outsider = (await createTestUser({ role: 'student' })).user;
      const task = await WeeklyTask.create({
        course: course._id,
        instructor: instructor._id,
        week: 1,
        title: 'Week 1',
        items: [{ title: 'A' }],
      });
      const itemId = task.items[0]._id.toString();
      await expect(
        weeklyTaskService.setItemCompletion(
          task._id,
          itemId,
          { id: outsider._id.toString(), role: 'student' },
          true,
        ),
      ).rejects.toThrow('Only enrolled students can track progress');
    });
  });
});
