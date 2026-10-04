// scripts/syncIndexes.js
//
// Explicit index management (PLAN 3.1). By default it only REPORTS what a
// sync would do; nothing is changed unless you pass --apply.
//
// Usage (from the project root; NODE_ENV is required so you always know
// WHICH database you are touching - loadEnv() picks .env.<NODE_ENV>):
//   npm run indexes:sync                       # dry run, development
//   npm run indexes:sync:prod                  # dry run, production
//   npm run indexes:sync:prod -- --apply       # apply, production
//
// Flags:
//   --dry-run   report only (the default)
//   --apply     run Model.syncIndexes() for every model
//
// WARNING: syncIndexes() DROPS every index that is not declared in a
// Mongoose schema (including ones another tool or person created by hand)
// and builds the missing ones. Always read the dry-run output first. Run it
// after deploying a release that changes indexes.
//
// Only collection names, index names/keys and counts are printed. The
// connection string is never printed.

const args = process.argv.slice(2);
const wantsApply = args.includes('--apply');
const wantsDryRun = args.includes('--dry-run');
const unknownArgs = args.filter((a) => a !== '--apply' && a !== '--dry-run');

if (!process.env.NODE_ENV) {
  console.error(
    'NODE_ENV is not set. Set it explicitly (development or production) so ' +
      'you know which database this will touch.',
  );
  process.exit(1);
}
if (wantsApply && wantsDryRun) {
  console.error('Use either --dry-run or --apply, not both.');
  process.exit(1);
}
if (unknownArgs.length) {
  console.error(`Unknown argument(s): ${unknownArgs.join(' ')}`);
  console.error('Usage: node scripts/syncIndexes.js [--dry-run | --apply]');
  process.exit(1);
}

require('../src/config/loadEnv')();
// connectDB() syncs indexes when SYNC_INDEXES=true. This script decides that
// itself through --apply, so the flag must never apply here.
process.env.SYNC_INDEXES = 'false';
require('../src/config/env.config')();

const mongoose = require('mongoose');
const connectDB = require('../src/config/db.config');
const {
  getIndexDiff,
  describeDeclared,
  keySignature,
} = require('../src/utils/indexSync');

// Every model, required explicitly so none is missed.
const models = [
  require('../src/models/user.model'),
  require('../src/models/track.model'),
  require('../src/models/course.model'),
  require('../src/models/session.model'),
  require('../src/models/assignment.model'),
  require('../src/models/weeklytask.model'),
  require('../src/models/review.model'),
  require('../src/models/event.model'),
  require('../src/models/announcement.model'),
  require('../src/models/contact.model'),
  require('../src/models/activitylog.model'),
  require('../src/models/dashboardstats.model'),
];

// Number of key groups that hold more than one document. A unique index
// cannot be built while this is above 0.
const duplicateGroups = async (Model, fields) => {
  const id = {};
  Object.keys(fields).forEach((key) => {
    id[key.replace(/\./g, '_')] = `$${key}`;
  });
  const rows = await Model.aggregate([
    { $group: { _id: id, n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
    { $count: 'groups' },
  ]).option({ maxTimeMS: 20000 });
  return rows[0]?.groups || 0;
};

(async () => {
  const mode = wantsApply ? 'APPLY' : 'DRY RUN';
  console.log(`Index sync (${mode}), NODE_ENV=${process.env.NODE_ENV}`);

  await connectDB({ checkIndexes: false });
  console.log(`Database: ${mongoose.connection.name}\n`);

  let totalCreate = 0;
  let totalDrop = 0;
  let totalDuplicates = 0;

  // Sequential on purpose: readable output, one query at a time.
  // eslint-disable-next-line no-restricted-syntax
  for (const Model of models) {
    // eslint-disable-next-line no-await-in-loop
    const diff = await getIndexDiff(Model);
    totalCreate += diff.toCreate.length;
    totalDrop += diff.toDrop.length;

    console.log(
      `[${diff.collection}] existing: ${diff.existing.length} | ` +
        `declared: ${Model.schema.indexes().length} (besides _id)`,
    );
    if (!diff.toCreate.length && !diff.toDrop.length) {
      console.log('  up to date');
    }
    // eslint-disable-next-line no-restricted-syntax
    for (const entry of diff.toCreate) {
      let note = '';
      if (entry[1] && entry[1].unique) {
        // eslint-disable-next-line no-await-in-loop
        const groups = await duplicateGroups(Model, entry[0]);
        totalDuplicates += groups;
        const fail = groups ? ' (BUILD WILL FAIL)' : '';
        note = ` - duplicate groups: ${groups}${fail}`;
      }
      console.log(
        `  WOULD CREATE: ${describeDeclared(diff.collection, entry)}${note}`,
      );
    }
    diff.toDrop.forEach((name) => {
      const index = diff.existing.find((i) => i.name === name);
      const key = index ? keySignature(index.key) : '';
      console.log(`  WOULD DROP:   ${diff.collection}: ${name} (${key})`);
    });
  }

  console.log(
    `\nSummary: ${totalCreate} to create, ${totalDrop} to drop, ` +
      `${totalDuplicates} duplicate group(s) blocking unique indexes.`,
  );

  if (!wantsApply) {
    console.log('Dry run only: nothing was changed. Use --apply to sync.');
    await mongoose.disconnect();
    return;
  }

  console.log(
    '\n!!! WARNING: syncIndexes() DROPS every index not declared in the ' +
      'schemas above and builds the missing ones. !!!',
  );
  // eslint-disable-next-line no-restricted-syntax
  for (const Model of models) {
    // eslint-disable-next-line no-await-in-loop
    const dropped = await Model.syncIndexes();
    console.log(
      `[${Model.collection.collectionName}] synced; dropped: ` +
        `${dropped.length ? dropped.join(', ') : 'none'}`,
    );
  }
  console.log('Done.');
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error(`Index sync failed: ${err.message}`);
  try {
    await mongoose.disconnect();
  } catch (e) {
    // already disconnected
  }
  process.exit(1);
});
