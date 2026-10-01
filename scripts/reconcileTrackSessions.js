// scripts/reconcileTrackSessions.js
//
// Usage: node scripts/reconcileTrackSessions.js [--dry-run]
//
// BACKEND-REQUESTS-2.md #4.1: a track can report `sessions: []` /
// `sessionCount: 0` while sessions are actually linked to it (the live
// example: "Full Stack Web Dev 2026" - 3 sessions linked, sessionCount 0).
// A track<->session link is stored on BOTH sides (Track.sessions and
// Session.tracks); `GET /sessions/track/:id` and enrollment sync read
// Session.tracks, while `sessionCount` and `GET /tracks/:id/assignments`
// read Track.sessions - so when the two disagree, different screens show
// different answers.
//
// This is the sessions counterpart of scripts/reconcileTrackCourses.js
// (which repairs #4.2 for courses) and follows the same rules:
//   * Session.tracks is the source of truth. It is the side the session
//     list endpoints and enrollment already trust, so the repair makes the
//     numbers match what people can already see working.
//   * Every track's `sessions` array is recomputed to match it.
//   * Second pass: Session.isStandalone is recomputed from reality
//     (standalone = belongs to no track AND no course).
//   * Idempotent: a no-op once the data is clean. Safe to re-run.
//   * `--dry-run` prints what would change and writes nothing.
//   * Only ever SETS the two fields above. It never deletes a track or a
//     session, and never touches students/enrollments.
//
// The code fix (track.service.js: atomic, self-repairing link/unlink) means
// new desyncs shouldn't appear going forward - this is a one-off backfill
// for records that are already out of sync.
//
// NOT executed as part of any stage - run it yourself, `--dry-run` first.

require('../src/config/loadEnv')();
require('../src/config/env.config')();
const mongoose = require('mongoose');
const Track = require('../src/models/track.model');
const Session = require('../src/models/session.model');

(async () => {
  const dryRun = process.argv.includes('--dry-run');
  const label = dryRun ? '[dry-run] Would fix' : 'Fixing';

  await mongoose.connect(process.env.DATABASE_URL);

  try {
    // ---- Pass 1: Track.sessions <- Session.tracks -----------------------
    const tracks = await Track.find().select('_id title sessions');
    let fixedTracks = 0;

    // eslint-disable-next-line no-restricted-syntax
    for (const track of tracks) {
      // eslint-disable-next-line no-await-in-loop
      const actualSessionIds = (
        await Session.find({ tracks: track._id }).select('_id')
      ).map((s) => s._id.toString());

      const storedSessionIds = track.sessions.map((id) => id.toString());

      const missing = actualSessionIds.filter(
        (id) => !storedSessionIds.includes(id),
      );
      const stale = storedSessionIds.filter(
        (id) => !actualSessionIds.includes(id),
      );

      if (missing.length || stale.length) {
        fixedTracks += 1;
        console.log(
          `${label} track "${track.title}" (${track._id}) — ` +
            `${missing.length ? `missing: [${missing.join(', ')}] ` : ''}` +
            `${stale.length ? `stale: [${stale.join(', ')}]` : ''}`.trim(),
        );

        if (!dryRun) {
          // eslint-disable-next-line no-await-in-loop
          await Track.updateOne(
            { _id: track._id },
            { $set: { sessions: actualSessionIds } },
          );
        }
      }
    }

    // ---- Pass 2: Session.isStandalone ----------------------------------
    const sessions = await Session.find().select(
      '_id title tracks course isStandalone',
    );
    let fixedSessions = 0;

    // eslint-disable-next-line no-restricted-syntax
    for (const session of sessions) {
      const shouldBeStandalone = !session.tracks?.length && !session.course;

      if (session.isStandalone !== shouldBeStandalone) {
        fixedSessions += 1;
        console.log(
          `${label} session "${session.title}" (${session._id}) — ` +
            `isStandalone ${session.isStandalone} -> ${shouldBeStandalone}`,
        );

        if (!dryRun) {
          // eslint-disable-next-line no-await-in-loop
          await Session.updateOne(
            { _id: session._id },
            { $set: { isStandalone: shouldBeStandalone } },
          );
        }
      }
    }

    if (fixedTracks === 0 && fixedSessions === 0) {
      console.log(
        '✅ No desynced track/session references found. Nothing to do.',
      );
    } else {
      console.log(
        `${dryRun ? '[dry-run] Would fix' : '✅ Fixed'} ${fixedTracks} track(s) out of ${tracks.length} checked, ` +
          `and ${fixedSessions} session(s) out of ${sessions.length} checked.`,
      );
    }
  } finally {
    await mongoose.disconnect();
  }
})();
