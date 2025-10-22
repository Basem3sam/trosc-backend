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

const DashboardStats = mongoose.model('DashboardStats', dashboardStatsSchema);
module.exports = DashboardStats;
