// scripts/generateDashboardSnapshot.js
//
// Usage: node scripts/generateDashboardSnapshot.js <daily|weekly|monthly> [ISO date]
//
// Intended to be wired up to an OS-level cron / scheduled task, e.g.:
//   # Every day at 00:05
//   5 0 * * * cd /path/to/app && node scripts/generateDashboardSnapshot.js daily
//   # Every Monday at 00:10
//   10 0 * * 1 node scripts/generateDashboardSnapshot.js weekly
//   # 1st of every month at 00:15
//   15 0 1 * * node scripts/generateDashboardSnapshot.js monthly
//
// Calls the service directly rather than the HTTP API, so there's no
// auth-token management needed in a cron context.

require('dotenv').config();
const mongoose = require('mongoose');
const dashboardStatsService = require('../src/services/dashboardStats.service');

(async () => {
  const period = process.argv[2];
  const dateArg = process.argv[3];

  if (!['daily', 'weekly', 'monthly'].includes(period)) {
    console.log(
      'Usage: node scripts/generateDashboardSnapshot.js <daily|weekly|monthly> [ISO date]',
    );
    process.exit(1);
  }

  await mongoose.connect(process.env.DATABASE_URL);

  try {
    const snapshot = await dashboardStatsService.generateSnapshot(
      period,
      dateArg ? new Date(dateArg) : undefined,
    );
    console.log(
      `✅ Generated ${period} snapshot for ${snapshot.date.toISOString()}`,
    );
  } catch (error) {
    console.error('❌ Failed to generate snapshot:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
