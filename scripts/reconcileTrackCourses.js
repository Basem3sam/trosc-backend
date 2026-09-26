// scripts/reconcileTrackCourses.js
//
// Usage: node scripts/reconcileTrackCourses.js [--dry-run]
//
// BACKEND-REQUESTS.md #3.3: before this fix, course.service.js#createCourse
// and #updateCourse wrote a course's `track` field directly (Course.create()
// / Course.findByIdAndUpdate()) without ever updating the corresponding
// Track's `courses` array — only the dedicated track-side endpoints
// (trackService.addCourseToTrack/removeCourseFromTrack) kept both sides in
// sync. Any course created or re-tracked through the course endpoints before
// this fix can have left a track's `courses` array out of sync with reality
// (the specific case mentioned in the request doc: a track showing 1 course
// while 2 courses actually point at it).
//
// This script treats Course.track as the source of truth (it's the side
// course.service.js was writing directly) and recomputes each track's
// `courses` array to match. Safe to re-run — it's a no-op once the data is
// clean, and the fix in course.service.js means it shouldn't find anything
// new going forward (this is a backfill, not an ongoing requirement).

require('../src/config/loadEnv')();
require('../src/config/env.config')();
const mongoose = require('mongoose');
const Track = require('../src/models/track.model');
const Course = require('../src/models/course.model');

(async () => {
  const dryRun = process.argv.includes('--dry-run');

  await mongoose.connect(process.env.DATABASE_URL);

  try {
    const tracks = await Track.find().select('_id title courses');
    let fixedCount = 0;

    // eslint-disable-next-line no-restricted-syntax
    for (const track of tracks) {
      // eslint-disable-next-line no-await-in-loop
      const actualCourseIds = (
        await Course.find({ track: track._id }).select('_id')
      ).map((c) => c._id.toString());

      const storedCourseIds = track.courses.map((id) => id.toString());

      const missing = actualCourseIds.filter(
        (id) => !storedCourseIds.includes(id),
      );
      const stale = storedCourseIds.filter(
        (id) => !actualCourseIds.includes(id),
      );

      if (missing.length || stale.length) {
        fixedCount += 1;
        console.log(
          `${dryRun ? '[dry-run] Would fix' : 'Fixing'} track "${track.title}" (${track._id}) — ` +
            `${missing.length ? `missing: [${missing.join(', ')}] ` : ''}` +
            `${stale.length ? `stale: [${stale.join(', ')}]` : ''}`.trim(),
        );

        if (!dryRun) {
          // eslint-disable-next-line no-await-in-loop
          await Track.findByIdAndUpdate(track._id, {
            $set: { courses: actualCourseIds },
          });
        }
      }
    }

    if (fixedCount === 0) {
      console.log('✅ No desynced track/course references found. Nothing to do.');
    } else {
      console.log(
        `${dryRun ? '[dry-run] Would fix' : '✅ Fixed'} ${fixedCount} track(s) out of ${tracks.length} checked.`,
      );
    }
  } finally {
    await mongoose.disconnect();
  }
})();
