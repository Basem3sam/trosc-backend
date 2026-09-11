const mongoose = require('mongoose');
const dashboardStatsService = require('../../src/services/dashboardStats.service');
const DashboardStats = require('../../src/models/dashboardstats.model');
const Assignment = require('../../src/models/assignment.model');
const Track = require('../../src/models/track.model');
const Course = require('../../src/models/course.model');
const Event = require('../../src/models/event.model');
const Announcement = require('../../src/models/announcement.model');
const { createTestUser } = require('../helpers/testUser');
const { buildTrackAndCourseFixture } = require('../helpers/fixtures');

describe('DashboardStats Service', () => {
  describe('getPeriodBounds', () => {
    it('bounds a daily period to midnight UTC through the next midnight', () => {
      const { start, end } = dashboardStatsService.getPeriodBounds(
        'daily',
        new Date('2025-06-15T14:30:00.000Z'),
      );
      expect(start.toISOString()).toBe('2025-06-15T00:00:00.000Z');
      expect(end.toISOString()).toBe('2025-06-16T00:00:00.000Z');
    });

    it('bounds a weekly period to Monday through the following Monday', () => {
      // 2025-06-18 is a Wednesday
      const { start, end } = dashboardStatsService.getPeriodBounds(
        'weekly',
        new Date('2025-06-18T09:00:00.000Z'),
      );
      expect(start.toISOString()).toBe('2025-06-16T00:00:00.000Z'); // Monday
      expect(end.toISOString()).toBe('2025-06-23T00:00:00.000Z');
    });

    it('handles a weekly period anchored on a Sunday correctly', () => {
      // 2025-06-22 is a Sunday — should belong to the week starting Mon 2025-06-16
      const { start } = dashboardStatsService.getPeriodBounds(
        'weekly',
        new Date('2025-06-22T23:59:00.000Z'),
      );
      expect(start.toISOString()).toBe('2025-06-16T00:00:00.000Z');
    });

    it('bounds a monthly period to the 1st through the 1st of next month', () => {
      const { start, end } = dashboardStatsService.getPeriodBounds(
        'monthly',
        new Date('2025-02-27T00:00:00.000Z'),
      );
      expect(start.toISOString()).toBe('2025-02-01T00:00:00.000Z');
      expect(end.toISOString()).toBe('2025-03-01T00:00:00.000Z');
    });

    it('throws for an unknown period', () => {
      expect(() =>
        dashboardStatsService.getPeriodBounds('yearly', new Date()),
      ).toThrow(/Unknown period/);
    });

    it('throws for an invalid date', () => {
      expect(() =>
        dashboardStatsService.getPeriodBounds('daily', 'not-a-date'),
      ).toThrow(/Invalid date/);
    });
  });

  describe('generateSnapshot', () => {
    it('counts users, tracks, courses, events, and announcements as of the period end', async () => {
      await createTestUser({ role: 'student' });
      await createTestUser({ role: 'student' });
      const { instructor } = await buildTrackAndCourseFixture();
      await Event.create({
        title: 'Kickoff',
        description: 'desc',
        date: new Date(Date.now() + 86400000),
        locationType: 'online',
        locationLink: 'https://meet.example.com/kickoff',
        createdBy: instructor._id,
      });
      await Announcement.create({
        title: 'Welcome',
        message: 'Hello everyone',
        createdBy: instructor._id,
        audience: 'all',
      });

      const snapshot = await dashboardStatsService.generateSnapshot('daily');

      expect(snapshot.totalUsers).toBeGreaterThanOrEqual(3); // 2 students + instructor(s)
      expect(snapshot.totalTracks).toBe(1);
      expect(snapshot.totalCourses).toBe(1);
      expect(snapshot.totalEvents).toBe(1);
      expect(snapshot.totalAnnouncements).toBe(1);
      expect(snapshot.period).toBe('daily');
    });

    it('only counts submissions that existed by the snapshot cutoff', async () => {
      const { instructor, course, student } = await buildTrackAndCourseFixture();

      const assignment = await Assignment.create({
        title: 'Assignment 1',
        description: 'desc',
        course: course._id,
        instructor: instructor._id,
        deadline: new Date(Date.now() + 86400000),
        submissions: [
          {
            student: student._id,
            file: 'https://drive.google.com/file/d/abc',
            submittedAt: new Date(), // "now" — counts for a live/today snapshot
          },
        ],
      });

      // Snapshot for YESTERDAY should not see today's submission.
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const pastSnapshot = await dashboardStatsService.generateSnapshot(
        'daily',
        yesterday,
      );
      expect(pastSnapshot.totalSubmissions).toBe(0);

      // Snapshot for TODAY should.
      const todaySnapshot = await dashboardStatsService.generateSnapshot(
        'daily',
        new Date(),
      );
      expect(todaySnapshot.totalSubmissions).toBe(1);

      await assignment.deleteOne();
    });

    it('computes avgCompletionRate as (submissions / enrolled) across assignments', async () => {
      const { instructor, course, student } = await buildTrackAndCourseFixture();
      // Add a second enrolled student so the course has 2 students total.
      const { user: secondStudent } = await createTestUser({ role: 'student' });
      await Course.findByIdAndUpdate(course._id, {
        $addToSet: { students: secondStudent._id },
      });

      await Assignment.create({
        title: 'Only Assignment',
        description: 'desc',
        course: course._id,
        instructor: instructor._id,
        deadline: new Date(Date.now() + 86400000),
        submissions: [
          { student: student._id, file: 'https://drive.google.com/file/d/abc' },
        ],
      });

      const snapshot = await dashboardStatsService.generateSnapshot('daily');
      // 1 submission out of 2 enrolled students = 50%
      expect(snapshot.avgCompletionRate).toBe(50);
    });

    it('excludes assignments with nobody enrolled from the completion-rate average', async () => {
      const { instructor } = await buildTrackAndCourseFixture();
      const emptyCourse = await Course.create({
        title: 'Empty Course',
        description: 'desc',
        instructor: instructor._id,
      });
      await Assignment.create({
        title: 'Orphan Assignment',
        description: 'desc',
        course: emptyCourse._id,
        instructor: instructor._id,
        deadline: new Date(Date.now() + 86400000),
      });

      const snapshot = await dashboardStatsService.generateSnapshot('daily');
      expect(snapshot.avgCompletionRate).toBe(0);
    });

    it('picks the track with the most enrolled students as mostActiveTrack', async () => {
      const { user: instructor } = await createTestUser({ role: 'instructor' });
      const { user: s1 } = await createTestUser({ role: 'student' });
      const { user: s2 } = await createTestUser({ role: 'student' });
      const { user: s3 } = await createTestUser({ role: 'student' });

      const small = await Track.create({
        title: 'Small Track',
        description: 'desc',
        instructor: instructor._id,
        students: [s1._id],
      });
      const big = await Track.create({
        title: 'Big Track',
        description: 'desc',
        instructor: instructor._id,
        students: [s1._id, s2._id, s3._id],
      });

      const snapshot = await dashboardStatsService.generateSnapshot('daily');
      expect(snapshot.mostActiveTrack.toString()).toBe(big._id.toString());
      expect(snapshot.mostActiveTrack.toString()).not.toBe(small._id.toString());
    });

    it('upserts rather than duplicating when run twice for the same period/date', async () => {
      await dashboardStatsService.generateSnapshot('daily');
      await createTestUser({ role: 'student' });
      await dashboardStatsService.generateSnapshot('daily');

      const count = await DashboardStats.countDocuments({ period: 'daily' });
      expect(count).toBe(1);
    });
  });

  describe('getLiveStats', () => {
    it('returns computed stats plus a computedAt timestamp, without persisting', async () => {
      await createTestUser({ role: 'student' });
      const stats = await dashboardStatsService.getLiveStats();

      expect(stats).toHaveProperty('totalUsers');
      expect(stats).toHaveProperty('computedAt');
      expect(await DashboardStats.countDocuments()).toBe(0);
    });
  });

  describe('getAllSnapshots / getSnapshotById', () => {
    it('lists snapshots and filters by period', async () => {
      await dashboardStatsService.generateSnapshot('daily');
      await dashboardStatsService.generateSnapshot('weekly');

      const all = await dashboardStatsService.getAllSnapshots({});
      expect(all.total).toBe(2);

      const dailyOnly = await dashboardStatsService.getAllSnapshots({
        period: 'daily',
      });
      expect(dailyOnly.total).toBe(1);
      expect(dailyOnly.dashboardStats[0].period).toBe('daily');
    });

    it('throws 404 for a non-existent snapshot ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        dashboardStatsService.getSnapshotById(fakeId),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getLatestSnapshot', () => {
    it('throws 404 when no snapshot exists yet for that period', async () => {
      await expect(
        dashboardStatsService.getLatestSnapshot('monthly'),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('returns the most recent snapshot for the period', async () => {
      await dashboardStatsService.generateSnapshot(
        'daily',
        new Date(Date.now() - 2 * 86400000),
      );
      await dashboardStatsService.generateSnapshot('daily', new Date());

      const latest = await dashboardStatsService.getLatestSnapshot('daily');
      const { start } = dashboardStatsService.getPeriodBounds(
        'daily',
        new Date(),
      );
      expect(new Date(latest.date).toISOString()).toBe(start.toISOString());
    });
  });

  describe('getTrends', () => {
    it('returns snapshots oldest-first, limited to N', async () => {
      await dashboardStatsService.generateSnapshot(
        'daily',
        new Date(Date.now() - 2 * 86400000),
      );
      await dashboardStatsService.generateSnapshot(
        'daily',
        new Date(Date.now() - 1 * 86400000),
      );
      await dashboardStatsService.generateSnapshot('daily', new Date());

      const trends = await dashboardStatsService.getTrends('daily', 2);
      expect(trends).toHaveLength(2);
      expect(new Date(trends[0].date).getTime()).toBeLessThan(
        new Date(trends[1].date).getTime(),
      );
    });
  });

  describe('deleteSnapshot', () => {
    it('deletes the matching snapshot', async () => {
      const snapshot = await dashboardStatsService.generateSnapshot('daily');
      await dashboardStatsService.deleteSnapshot(snapshot._id);
      expect(await DashboardStats.findById(snapshot._id)).toBeNull();
    });

    it('throws 404 for a non-existent ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        dashboardStatsService.deleteSnapshot(fakeId),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('pruneSnapshots', () => {
    it('deletes only snapshots whose date is older than the cutoff', async () => {
      const old = await dashboardStatsService.generateSnapshot(
        'daily',
        new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
      );
      const recent = await dashboardStatsService.generateSnapshot(
        'daily',
        new Date(),
      );

      const { deletedCount } = await dashboardStatsService.pruneSnapshots(365);

      expect(deletedCount).toBe(1);
      expect(await DashboardStats.findById(old._id)).toBeNull();
      expect(await DashboardStats.findById(recent._id)).not.toBeNull();
    });
  });
});
