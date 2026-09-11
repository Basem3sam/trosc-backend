const mongoose = require('mongoose');
const activityLogService = require('../../src/services/activityLog.service');
const ActivityLog = require('../../src/models/activitylog.model');
const { createTestUser } = require('../helpers/testUser');

describe('ActivityLog Service', () => {
  let user;
  let otherUser;

  beforeEach(async () => {
    user = (await createTestUser({ role: 'student' })).user;
    otherUser = (await createTestUser({ role: 'student' })).user;
  });

  describe('logActivity', () => {
    it('creates a log entry with the given fields', async () => {
      const log = await activityLogService.logActivity({
        userId: user._id,
        action: 'login',
        metadata: { ip: '127.0.0.1' },
      });

      expect(log).not.toBeNull();
      expect(log.user.toString()).toBe(user._id.toString());
      expect(log.action).toBe('login');
      expect(log.metadata.ip).toBe('127.0.0.1');

      const inDb = await ActivityLog.findById(log._id);
      expect(inDb).not.toBeNull();
    });

    it('records targetModel/targetId when provided', async () => {
      const trackId = new mongoose.Types.ObjectId();
      const log = await activityLogService.logActivity({
        userId: user._id,
        action: 'enrolled_in_track',
        targetModel: 'Track',
        targetId: trackId,
      });

      expect(log.targetModel).toBe('Track');
      expect(log.targetId.toString()).toBe(trackId.toString());
    });

    it('never throws — returns null on failure instead', async () => {
      // Invalid action value + missing required user both fail Mongoose
      // validation. logActivity must swallow that, not propagate it,
      // since callers (signup, enrollment, etc.) can't be allowed to fail
      // because an audit-log write failed.
      const result = await activityLogService.logActivity({
        userId: undefined,
        action: 'not_a_real_action',
      });

      expect(result).toBeNull();
      expect(await ActivityLog.countDocuments()).toBe(0);
    });
  });

  describe('getAllActivityLogs', () => {
    beforeEach(async () => {
      await activityLogService.logActivity({
        userId: user._id,
        action: 'login',
      });
      await activityLogService.logActivity({
        userId: otherUser._id,
        action: 'signed_up',
      });
    });

    it('returns all logs, newest first, with pagination metadata', async () => {
      const { activityLogs, total, pagination } =
        await activityLogService.getAllActivityLogs({});

      expect(total).toBe(2);
      expect(activityLogs).toHaveLength(2);
      expect(pagination.page).toBe(1);
      // Newest first: 'signed_up' was logged after 'login'.
      expect(activityLogs[0].action).toBe('signed_up');
    });

    it('supports filtering by action via the generic query filter', async () => {
      const { activityLogs, total } =
        await activityLogService.getAllActivityLogs({ action: 'login' });

      expect(total).toBe(1);
      expect(activityLogs[0].action).toBe('login');
    });

    it('populates the user field', async () => {
      const { activityLogs } = await activityLogService.getAllActivityLogs({});
      expect(activityLogs[0].user).toHaveProperty('name');
    });
  });

  describe('getActivityLogById', () => {
    it('returns the matching log', async () => {
      const created = await activityLogService.logActivity({
        userId: user._id,
        action: 'login',
      });

      const found = await activityLogService.getActivityLogById(created._id);
      expect(found._id.toString()).toBe(created._id.toString());
    });

    it('throws 404 for a non-existent ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        activityLogService.getActivityLogById(fakeId),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getUserActivityLogs', () => {
    beforeEach(async () => {
      await activityLogService.logActivity({
        userId: user._id,
        action: 'login',
      });
      await activityLogService.logActivity({
        userId: user._id,
        action: 'updated_profile',
      });
      await activityLogService.logActivity({
        userId: otherUser._id,
        action: 'login',
      });
    });

    it("only returns the requested user's logs", async () => {
      const { activityLogs, total } =
        await activityLogService.getUserActivityLogs(user._id, {});

      expect(total).toBe(2);
      expect(
        activityLogs.every(
          (log) => log.user.toString() === user._id.toString(),
        ),
      ).toBe(true);
    });

    it('ignores a spoofed ?user= query param — always scoped to the ID argument', async () => {
      const { activityLogs, total } =
        await activityLogService.getUserActivityLogs(user._id, {
          user: otherUser._id.toString(),
        });

      expect(total).toBe(2);
      expect(
        activityLogs.every(
          (log) => log.user.toString() === user._id.toString(),
        ),
      ).toBe(true);
    });
  });

  describe('getActivitySummary', () => {
    beforeEach(async () => {
      await activityLogService.logActivity({
        userId: user._id,
        action: 'login',
      });
      await activityLogService.logActivity({
        userId: user._id,
        action: 'login',
      });
      await activityLogService.logActivity({
        userId: otherUser._id,
        action: 'signed_up',
      });
    });

    it('returns total count and a per-action breakdown', async () => {
      const summary = await activityLogService.getActivitySummary();

      expect(summary.totalActivities).toBe(3);
      const loginEntry = summary.byAction.find((a) => a.action === 'login');
      expect(loginEntry.count).toBe(2);
    });

    it('returns the most active users, sorted by count', async () => {
      const summary = await activityLogService.getActivitySummary();

      expect(summary.mostActiveUsers[0].userId.toString()).toBe(
        user._id.toString(),
      );
      expect(summary.mostActiveUsers[0].count).toBe(2);
    });

    it('respects a from/to date range', async () => {
      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const summary = await activityLogService.getActivitySummary({
        from: future,
      });

      expect(summary.totalActivities).toBe(0);
    });

    it('can restrict the breakdown to a single action', async () => {
      const summary = await activityLogService.getActivitySummary({
        action: 'signed_up',
      });

      expect(summary.totalActivities).toBe(1);
      expect(summary.byAction).toEqual([{ action: 'signed_up', count: 1 }]);
    });
  });

  describe('deleteActivityLog', () => {
    it('deletes the matching log', async () => {
      const created = await activityLogService.logActivity({
        userId: user._id,
        action: 'login',
      });

      await activityLogService.deleteActivityLog(created._id);
      expect(await ActivityLog.findById(created._id)).toBeNull();
    });

    it('throws 404 for a non-existent ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        activityLogService.deleteActivityLog(fakeId),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('pruneActivityLogs', () => {
    it('deletes only logs older than the cutoff', async () => {
      const old = await activityLogService.logActivity({
        userId: user._id,
        action: 'login',
      });

      // Backdate via the raw collection, NOT via ActivityLog.findByIdAndUpdate:
      // the schema is defined with `timestamps: { createdAt: true, ... }`, and
      // Mongoose deliberately refuses to let update operations overwrite a
      // timestamp-managed field. Going straight to the driver bypasses that
      // guard, which is exactly what a test simulating an old record needs.
      await ActivityLog.collection.updateOne(
        { _id: old._id },
        {
          $set: {
            createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
          },
        },
      );

      const recent = await activityLogService.logActivity({
        userId: user._id,
        action: 'login',
      });

      // Sanity check: the backdate actually took effect. If this ever fails,
      // the prune assertion below would silently mislead you.
      const backdated = await ActivityLog.findById(old._id);
      expect(backdated.createdAt.getTime()).toBeLessThan(
        Date.now() - 300 * 24 * 60 * 60 * 1000,
      );

      const { deletedCount } = await activityLogService.pruneActivityLogs(365);

      expect(deletedCount).toBe(1);
      expect(await ActivityLog.findById(old._id)).toBeNull();
      expect(await ActivityLog.findById(recent._id)).not.toBeNull();
    });
  });
});
