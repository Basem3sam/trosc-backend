// scripts/generateDashboardSnapshot.js
//
// Usage:
//   node scripts/generateDashboardSnapshot.js <daily|weekly|monthly>
//   node scripts/generateDashboardSnapshot.js <daily|weekly|monthly> --previous
//   node scripts/generateDashboardSnapshot.js <daily|weekly|monthly> <ISO date>
//
//   (no extra arg)  snapshot the period that contains NOW - "refresh
//                   today's numbers", still in progress.
//   --previous      snapshot the period that has just FINISHED (yesterday /
//                   last Mon-Sun week / last calendar month). THIS is what
//                   a scheduled job should use: it runs minutes after a
//                   period starts, so with no argument it would record a
//                   period that has barely begun (about zero new users)
//                   and never the one that actually ended (#5.2).
//   <ISO date>      snapshot the period containing that date (backfill).
//
// Intended to be wired up to an OS-level cron / scheduled task, e.g.:
//   # Every day at 00:05
//   5 0 * * * cd /path/to/app && node scripts/generateDashboardSnapshot.js daily --previous
//   # Every Monday at 00:10
//   10 0 * * 1 node scripts/generateDashboardSnapshot.js weekly --previous
//   # 1st of every month at 00:15
//   15 0 1 * * node scripts/generateDashboardSnapshot.js monthly --previous
//
// Calls the service directly rather than the HTTP API, so there's no
// auth-token management needed in a cron context.

require('../src/config/loadEnv')();
require('../src/config/env.config')();
const mongoose = require('mongoose');
const dashboardStatsService = require('../src/services/dashboardStats.service');

const USAGE =
  'Usage: node scripts/generateDashboardSnapshot.js <daily|weekly|monthly> [--previous | ISO date]';

(async () => {
  const period = process.argv[2];
  const extraArgs = process.argv.slice(3);
  const usePrevious = extraArgs.includes('--previous');
  const dateArg = extraArgs.find((arg) => !arg.startsWith('--'));
  const unknownFlags = extraArgs.filter(
    (arg) => arg.startsWith('--') && arg !== '--previous',
  );

  if (
    !['daily', 'weekly', 'monthly'].includes(period) ||
    unknownFlags.length > 0 ||
    (usePrevious && dateArg)
  ) {
    console.log(USAGE);
    process.exit(1);
  }

  await mongoose.connect(process.env.DATABASE_URL);

  try {
    let referenceDate;
    if (usePrevious) {
      referenceDate = dashboardStatsService.getPreviousPeriodDate(period);
    } else if (dateArg) {
      referenceDate = new Date(dateArg);
    }

    const snapshot = await dashboardStatsService.generateSnapshot(
      period,
      referenceDate,
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
