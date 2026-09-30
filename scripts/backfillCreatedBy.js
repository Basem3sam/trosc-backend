// scripts/backfillCreatedBy.js
//
// Usage: node scripts/backfillCreatedBy.js [--dry-run]
//
// Decisions.md Q6: Assignment and WeeklyTask gained a new `createdBy`
// field (pure historical attribution — see the comment on that field in
// src/models/assignment.model.js / src/models/weeklytask.model.js for why
// it's kept strictly separate from `instructor`, the current-authority
// field). Every record created before that field existed has no
// `createdBy` at all. Per Q6: "For existing records that do not have
// createdBy: createdBy = existing instructor."
//
// This script is intentionally boring:
//   - only ever SETS createdBy where it is currently missing
//   - never overwrites an existing createdBy, even if it looks wrong
//   - is a no-op (safe to re-run on a schedule, or after this script
//     itself already ran) once every record has one
//   - --dry-run reports exactly what it would change without writing
//     anything
//
// Not run against production as part of this delivery — per the
// project's implementation constraints, that's a deliberate, separate
// decision for later. This script is ready whenever that decision is
// made.

require('../src/config/loadEnv')();
require('../src/config/env.config')();
const mongoose = require('mongoose');
const Assignment = require('../src/models/assignment.model');
const WeeklyTask = require('../src/models/weeklytask.model');

// { label, Model } for each collection this backfill covers. Adding a
// third model later (should one ever need retroactive createdBy/
// instructor decoupling) is just one more entry here.
const TARGETS = [
  { label: 'Assignment', Model: Assignment },
  { label: 'WeeklyTask', Model: WeeklyTask },
];

async function backfillModel({ label, Model }, dryRun) {
  // Only records missing createdBy entirely — never touches one that's
  // already set, however it got set (this script's own earlier run, or
  // anything else).
  const candidates = await Model.find({
    createdBy: { $exists: false },
  }).select('_id instructor');

  if (candidates.length === 0) {
    console.log(`${label}: nothing to backfill.`);
    return 0;
  }

  console.log(
    `${label}: ${dryRun ? 'would backfill' : 'backfilling'} ${candidates.length} record(s) — createdBy = instructor.`,
  );

  if (dryRun) {
    candidates.forEach((doc) => {
      console.log(
        `  [dry-run] ${label} ${doc._id} → createdBy = ${doc.instructor}`,
      );
    });
    return candidates.length;
  }

  // eslint-disable-next-line no-restricted-syntax
  for (const doc of candidates) {
    // $exists: false in the filter re-checked here per-document isn't
    // necessary (findOneAndUpdate below only touches this exact _id,
    // decided by the query above), but the filter is repeated anyway so
    // that if this document was touched by something else between the
    // find() and this update, a createdBy set in that window is still
    // never overwritten.
    // eslint-disable-next-line no-await-in-loop
    await Model.updateOne(
      { _id: doc._id, createdBy: { $exists: false } },
      { $set: { createdBy: doc.instructor } },
    );
  }

  return candidates.length;
}

(async () => {
  const dryRun = process.argv.includes('--dry-run');

  await mongoose.connect(process.env.DATABASE_URL);

  try {
    let total = 0;
    // eslint-disable-next-line no-restricted-syntax
    for (const target of TARGETS) {
      // eslint-disable-next-line no-await-in-loop
      total += await backfillModel(target, dryRun);
    }

    if (total === 0) {
      console.log('✅ No missing createdBy fields found. Nothing to do.');
    } else {
      console.log(
        `${dryRun ? '[dry-run] Would set' : '✅ Set'} createdBy on ${total} record(s) total.`,
      );
    }
  } finally {
    await mongoose.disconnect();
  }
})();
