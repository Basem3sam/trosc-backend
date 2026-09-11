/**
 * @swagger
 * components:
 *   schemas:
 *     DashboardStats:
 *       type: object
 *       required:
 *         - period
 *         - date
 *       properties:
 *         _id:
 *           type: string
 *           example: 6713b5ac12ef4567890a8888
 *         period:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           description: What span of time this snapshot's "new*" fields cover
 *           example: daily
 *         date:
 *           type: string
 *           format: date-time
 *           description: Start of the period this snapshot represents (e.g. midnight UTC for 'daily', Monday 00:00 UTC for 'weekly', the 1st for 'monthly')
 *           example: 2025-10-18T00:00:00.000Z
 *         totalUsers:
 *           type: integer
 *           description: Cumulative users registered as of the end of this period
 *           example: 342
 *         newUsers:
 *           type: integer
 *           description: Users who registered during this period
 *           example: 12
 *         totalTracks: { type: integer, example: 8 }
 *         totalCourses: { type: integer, example: 24 }
 *         totalAssignments: { type: integer, example: 96 }
 *         totalSubmissions:
 *           type: integer
 *           description: Total submissions across all assignments, as of the end of this period
 *           example: 512
 *         avgCompletionRate:
 *           type: number
 *           description: >
 *             Average, across all assignments, of (submissions / enrolled
 *             students) as a percentage. Enrollment is evaluated against
 *             each assignment's current course/session roster, so this is
 *             most accurate for the most recent snapshot.
 *           example: 67.4
 *         totalEvents: { type: integer, example: 15 }
 *         totalAnnouncements: { type: integer, example: 40 }
 *         mostActiveTrack:
 *           type: string
 *           nullable: true
 *           description: ObjectId reference to the track with the most enrolled students as of this snapshot
 *           example: 507f1f77bcf86cd799439012
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     DashboardStatsResponse:
 *       type: object
 *       properties:
 *         status: { type: string, example: success }
 *         results: { type: integer, example: 30 }
 *         total: { type: integer, example: 90 }
 *         pagination: { type: object }
 *         data:
 *           type: object
 *           properties:
 *             dashboardStats:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DashboardStats'
 *
 *     DashboardTrendsResponse:
 *       type: object
 *       properties:
 *         status: { type: string, example: success }
 *         data:
 *           type: object
 *           properties:
 *             period: { type: string, example: daily }
 *             trends:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DashboardStats'
 */

const mongoose = require('mongoose');

const dashboardStatsSchema = new mongoose.Schema(
  {
    period: {
      type: String,
      enum: {
        values: ['daily', 'weekly', 'monthly'],
        message: 'period must be one of: daily, weekly, monthly',
      },
      required: [true, 'A snapshot must have a period'],
    },
    // Always normalized to the *start* of the period (see
    // dashboardStats.service.js#getPeriodBounds) — never an arbitrary
    // timestamp — so (period, date) uniquely identifies "the daily
    // snapshot for Oct 18" etc.
    date: {
      type: Date,
      required: [true, 'A snapshot must have a date'],
    },
    totalUsers: { type: Number, default: 0, min: 0 },
    newUsers: { type: Number, default: 0, min: 0 },
    totalTracks: { type: Number, default: 0, min: 0 },
    totalCourses: { type: Number, default: 0, min: 0 },
    totalAssignments: { type: Number, default: 0, min: 0 },
    totalSubmissions: { type: Number, default: 0, min: 0 },
    avgCompletionRate: { type: Number, default: 0, min: 0, max: 100 },
    totalEvents: { type: Number, default: 0, min: 0 },
    totalAnnouncements: { type: Number, default: 0, min: 0 },
    // A reference rather than a denormalized name/title string (the
    // original stub used `String`) so it stays correct if the track is
    // later renamed, and so callers can populate whatever fields they
    // need instead of being stuck with whatever was cached at snapshot
    // time.
    mostActiveTrack: {
      type: mongoose.Schema.ObjectId,
      ref: 'Track',
      default: null,
    },
  },
  {
    // Snapshots are generated once (or regenerated/upserted) and never
    // hand-edited — no need for a separately-tracked updatedAt.
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// A given period can only have one snapshot per date — re-generating
// (e.g. re-running today's daily snapshot) upserts in place rather than
// creating duplicates. Also serves as the primary lookup index for
// "latest snapshot" / "trend over the last N periods" queries.
dashboardStatsSchema.index({ period: 1, date: -1 }, { unique: true });

const DashboardStats = mongoose.model('DashboardStats', dashboardStatsSchema);
module.exports = DashboardStats;
