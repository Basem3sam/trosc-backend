// scripts/cleanupOrphanedTrackReferences.js
//
// Usage: node scripts/cleanupOrphanedTrackReferences.js [--dry-run]
//
// BACKEND-REQUESTS.md #3.1 / #3.2: before this fix, deleting a user only
// pulled them out of Track.students (and Course/Session.students) — never
// out of Track.pendingStudents or Track.pendingLeaves. Any user deleted
// before src/services/cascade.service.js#hardDeleteUserCascade was fixed
// to also pull those two arrays can be left behind as a dangling
// ObjectId that no longer resolves to a real user (e.g. the specific
// case called out in #3.1: track 6a3965b9f9dc5aeadd4cdd4f still lists
// pending student 6aac83e0f79f40d50490404e, whose account is gone).
//
// This script is intentionally generic rather than hardcoded to that one
// track/user pair: it scans every track's students/pendingStudents/
// pendingLeaves/instructors arrays, finds any id that doesn't resolve to an existing
// User, and pulls it. Safe to re-run on a schedule or after any manual
// data surgery — it's a no-op once the data is clean, and the cascade
// fix in cascade.service.js means it shouldn't find anything new going
// forward (this is a backfill, not an ongoing requirement).

require('../src/config/loadEnv')();
require('../src/config/env.config')();
const mongoose = require('mongoose');
const Track = require('../src/models/track.model');
const User = require('../src/models/user.model');

// Stage 4: `instructors` (co-instructors) is a user-reference array too, so
// a deleted co-instructor is cleaned up exactly like a deleted student.
const FIELDS = ['students', 'pendingStudents', 'pendingLeaves', 'instructors'];

(async () => {
  const dryRun = process.argv.includes('--dry-run');

  await mongoose.connect(process.env.DATABASE_URL);

  try {
    // Raw read through the aggregation framework on purpose: Track's
    // pre-find hook populates `instructor`/`instructors`, and populate
    // silently DROPS ids that no longer resolve - exactly the orphans this
    // script is looking for.
    const projection = { title: 1 };
    FIELDS.forEach((field) => {
      projection[field] = 1;
    });
    const tracks = await Track.aggregate([{ $project: projection }]);

    const allReferencedIds = new Set();
    tracks.forEach((track) => {
      FIELDS.forEach((field) => {
        (track[field] || []).forEach((id) => allReferencedIds.add(id.toString()));
      });
    });

    const existingUsers = await User.find({
      _id: { $in: [...allReferencedIds] },
    }).select('_id');
    const existingIds = new Set(existingUsers.map((u) => u._id.toString()));

    let totalOrphansRemoved = 0;

    // eslint-disable-next-line no-restricted-syntax
    for (const track of tracks) {
      const update = {};
      const report = [];
      let trackOrphanCount = 0;

      FIELDS.forEach((field) => {
        const orphans = (track[field] || []).filter(
          (id) => !existingIds.has(id.toString()),
        );
        if (orphans.length) {
          update[field] = orphans;
          trackOrphanCount += orphans.length;
          report.push(`${field}: [${orphans.join(', ')}]`);
        }
      });

      if (report.length) {
        console.log(
          `${dryRun ? '[dry-run] Would clean' : 'Cleaning'} track "${track.title}" (${track._id}) — ${report.join('; ')}`,
        );
        totalOrphansRemoved += trackOrphanCount;

        if (!dryRun) {
          const pullOps = {};
          Object.entries(update).forEach(([field, orphans]) => {
            pullOps[field] = { $in: orphans };
          });
          // eslint-disable-next-line no-await-in-loop
          await Track.findByIdAndUpdate(track._id, { $pull: pullOps });
        }
      }
    }

    if (totalOrphansRemoved === 0) {
      console.log('✅ No orphaned track references found. Nothing to do.');
    } else {
      console.log(
        `${dryRun ? '[dry-run] Would remove' : '✅ Removed'} ${totalOrphansRemoved} orphaned reference(s) across ${tracks.length} track(s).`,
      );
    }
  } finally {
    await mongoose.disconnect();
  }
})();
