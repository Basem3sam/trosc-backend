const mongoose = require('mongoose');

const dashboardStatsSchema = new mongoose.Schema(
  {
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    totalUsers: { type: Number, default: 0 },
    newUsers: { type: Number, default: 0 },
    totalTracks: { type: Number, default: 0 },
    totalCourses: { type: Number, default: 0 },
    totalAssignments: { type: Number, default: 0 },
    totalSubmissions: { type: Number, default: 0 },
    avgCompletionRate: { type: Number, default: 0 },
    totalEvents: { type: Number, default: 0 },
    totalAnnouncements: { type: Number, default: 0 },
    mostActiveTrack: String,
  },
  { timestamps: true },
);

// TODO - Future feature: Admin analytics dashboard - This model will store aggregated statistics for the admin dashboard, such as user growth, course completion rates, and popular tracks/courses. It can be updated periodically (e.g., daily) to provide insights into platform usage and performance.
// const DashboardStats = mongoose.model('DashboardStats', dashboardStatsSchema);
// module.exports = DashboardStats;

module.exports = () => {
  throw new Error('DashboardStats model is not implemented');
};
