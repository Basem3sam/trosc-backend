const dashboardStatsService = require('../src/services/dashboardStats.service');
const User = require('../src/models/user.model');
const { createTestUser } = require('./helpers/testUser');

// BACKEND-REQUESTS-2 #5.2: the scheduled job fires minutes after a period
// starts. Snapshotting "the period containing now" there records a period
// that has barely begun, and never the one that just ended. The job now
// asks for the PREVIOUS period instead.
describe('getPreviousPeriodDate (#5.2)', () => {
  const previousStart = (period, now) => {
    const date = dashboardStatsService.getPreviousPeriodDate(
      period,
      new Date(now),
    );
    return dashboardStatsService.getPeriodBounds(period, date).start;
  };

  it('daily: at 00:05 UTC it resolves to yesterday', () => {
    expect(
      previousStart('daily', '2026-10-01T00:05:00.000Z').toISOString(),
    ).toBe('2026-09-30T00:00:00.000Z');
  });

  it('daily: crosses a month and a year boundary', () => {
    expect(
      previousStart('daily', '2026-03-01T00:05:00.000Z').toISOString(),
    ).toBe('2026-02-28T00:00:00.000Z');
    expect(
      previousStart('daily', '2027-01-01T00:05:00.000Z').toISOString(),
    ).toBe('2026-12-31T00:00:00.000Z');
  });

  it('weekly: on Monday 00:10 UTC it resolves to the Monday-Sunday week that just ended', () => {
    // 2026-09-28 is a Monday
    expect(
      previousStart('weekly', '2026-09-28T00:10:00.000Z').toISOString(),
    ).toBe('2026-09-21T00:00:00.000Z');
  });

  it('monthly: on the 1st at 00:15 UTC it resolves to the month that just ended', () => {
    expect(
      previousStart('monthly', '2026-10-01T00:15:00.000Z').toISOString(),
    ).toBe('2026-09-01T00:00:00.000Z');
    // year rollover
    expect(
      previousStart('monthly', '2027-01-01T00:15:00.000Z').toISOString(),
    ).toBe('2026-12-01T00:00:00.000Z');
  });

  it('returns a date INSIDE the previous period, one millisecond before this one starts', () => {
    const date = dashboardStatsService.getPreviousPeriodDate(
      'daily',
      new Date('2026-10-01T13:45:00.000Z'),
    );
    expect(date.toISOString()).toBe('2026-09-30T23:59:59.999Z');
  });

  it('rejects an unknown period and an invalid date, like getPeriodBounds', () => {
    expect(() =>
      dashboardStatsService.getPreviousPeriodDate('hourly', new Date()),
    ).toThrow(/Unknown period/);
    expect(() =>
      dashboardStatsService.getPreviousPeriodDate('daily', 'not-a-date'),
    ).toThrow(/Invalid date/);
  });

  describe('end to end with generateSnapshot', () => {
    // The 00:05 UTC cron run on 2026-10-01.
    const cronTime = new Date('2026-10-01T00:05:00.000Z');

    beforeEach(async () => {
      // A user who signed up at noon on 30 Sept: inside the day that just
      // finished, before the cron run.
      const { user } = await createTestUser({ role: 'student' });
      await User.collection.updateOne(
        { _id: user._id },
        { $set: { createdAt: new Date('2026-09-30T12:00:00.000Z') } },
      );
    });

    it('with the previous-period date, the snapshot is the finished day and counts that signup', async () => {
      const referenceDate = dashboardStatsService.getPreviousPeriodDate(
        'daily',
        cronTime,
      );
      const snapshot = await dashboardStatsService.generateSnapshot(
        'daily',
        referenceDate,
      );

      expect(snapshot.date.toISOString()).toBe('2026-09-30T00:00:00.000Z');
      expect(snapshot.newUsers).toBe(1);
    });

    it('with no date (the old scheduled behavior) the snapshot is the day that just began, with no new users', async () => {
      const snapshot = await dashboardStatsService.generateSnapshot(
        'daily',
        cronTime,
      );

      expect(snapshot.date.toISOString()).toBe('2026-10-01T00:00:00.000Z');
      expect(snapshot.newUsers).toBe(0);
    });
  });
});
