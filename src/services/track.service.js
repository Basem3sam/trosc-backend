const User = require('../models/user.model');
const Track = require('../models/track.model');
const Course = require('../models/course.model');
const Session = require('../models/session.model');
const APIFeatures = require('../utils/APIFeatures');
const AppError = require('../utils/AppError');
const cascade = require('./cascade.service');
const policy = require('./policy.service');
const { recordActivity } = require('./activityLog.service');

// ===================================================================
// 🎯 TRACK CRUD OPERATIONS
// ===================================================================

/**
 * Confirms `instructorId` refers to an existing user whose role is
 * 'instructor' or 'admin'. Only reached when an admin explicitly set
 * `instructor` in the request body (see track.controller.js) — the
 * default case (no instructor in the body) skips this entirely.
 * @throws {AppError} 400 if the user doesn't exist or has the wrong role
 */
async function assertValidInstructor(instructorId) {
  // `active` is select:false, so it has to be asked for explicitly.
  const user = await User.findById(instructorId).select('role +active');
  if (!user) {
    throw new AppError('No user found with that instructor ID', 400);
  }
  if (!['instructor', 'admin'].includes(user.role)) {
    throw new AppError(
      'Instructor must be a user with role "instructor" or "admin"',
      400,
    );
  }
  if (user.active === false) {
    throw new AppError('The selected instructor account is deactivated', 400);
  }
}

// The raw id stored in `doc[path]`, as a string (or null). Needed because
// Course.track is auto-populated by a pre-find hook, and Mongoose then
// returns the populated document - whose toString() is NOT its id, which
// made the old `course.track.toString() !== trackId` comparison always
// true.
function refId(doc, path) {
  const raw = doc.populated(path) || doc.get(path);
  if (!raw) return null;
  return (raw._id || raw).toString();
}

// ids stored at `path` of a (possibly populated) document, as strings.
function refIds(doc, path) {
  const raw = doc.populated(path) || doc.get(path) || [];
  return raw.map((value) => (value._id || value).toString());
}

/**
 * Stage 4 / #2.2: validates and normalizes a co-instructor list. Every id
 * must belong to an existing user with role 'instructor' or 'admin' (400
 * otherwise); duplicates are removed; the lead is never listed twice, so
 * an id equal to `leadId` is silently dropped.
 * @param {string[]} ids
 * @param {string} leadId - the track's lead instructor id
 * @returns {Promise<string[]>} the cleaned list of co-instructor ids
 */
async function normalizeInstructors(ids, leadId) {
  const unique = [...new Set(ids.map(String))].filter(
    (id) => id !== String(leadId),
  );
  if (!unique.length) return [];

  // `active` is select:false, so it has to be asked for explicitly.
  const users = await User.find({ _id: { $in: unique } }).select(
    'role +active',
  );
  const roleById = new Map(users.map((u) => [u.id, u.role]));
  const deactivatedIds = new Set(
    users.filter((u) => u.active === false).map((u) => u.id),
  );

  unique.forEach((id) => {
    if (!roleById.has(id)) {
      throw new AppError(`No user found with co-instructor ID ${id}`, 400);
    }
    if (!['instructor', 'admin'].includes(roleById.get(id))) {
      throw new AppError(
        'Co-instructors must be users with role "instructor" or "admin"',
        400,
      );
    }
    if (deactivatedIds.has(id)) {
      throw new AppError(
        'A selected co-instructor account is deactivated',
        400,
      );
    }
  });

  return unique;
}

/**
 * Returns the update to apply with `instructors` made consistent with the
 * (possibly new) lead: an explicit `instructors` list is validated; if only
 * the lead changes and the new lead was a co-instructor, they are moved out
 * of the co-instructor list. The previous lead is NOT added as a
 * co-instructor automatically - an admin who reassigns the lead decides
 * whether the old lead stays on the track.
 */
async function withConsistentInstructors(track, updateBody) {
  const leadId = updateBody.instructor || refId(track, 'instructor');

  if (updateBody.instructors !== undefined) {
    return {
      ...updateBody,
      instructors: await normalizeInstructors(updateBody.instructors, leadId),
    };
  }

  if (updateBody.instructor) {
    const current = refIds(track, 'instructors');
    if (current.includes(String(leadId))) {
      return {
        ...updateBody,
        instructors: current.filter((id) => id !== String(leadId)),
      };
    }
  }

  return updateBody;
}

/**
 * Create a new track
 * @param {Object} trackBody - Track data including title, description, instructor
 * @returns {Promise<Track>} Newly created track
 * @throws {AppError} 400 if validation fails, 409 if title exists
 */
exports.createTrack = async (trackBody, requestingUserId) => {
  if (trackBody.instructor && trackBody.instructor !== requestingUserId) {
    await assertValidInstructor(trackBody.instructor);
  }
  if (trackBody.instructors !== undefined) {
    // eslint-disable-next-line no-param-reassign
    trackBody.instructors = await normalizeInstructors(
      trackBody.instructors,
      trackBody.instructor,
    );
  }

  const track = await Track.create(trackBody);
  recordActivity({
    userId: requestingUserId,
    action: 'created_track',
    targetModel: 'Track',
    targetId: track._id,
  });
  return track;
};

// Stage 3B: the three roster arrays a non-staff reader never receives, and
// the flags derived from them (see policy.loadMembership).
const ROSTER_EXCLUSION = '-students -pendingStudents -pendingLeaves';
const MEMBERSHIP_FLAGS = {
  isEnrolled: 'students',
  isPending: 'pendingStudents',
  isPendingLeave: 'pendingLeaves',
};

// Runs a prepared track list query and applies the Q7 redaction. A caller
// who can never be staff (anonymous or a student) gets no roster arrays, so
// they are not loaded: the page's counts and the caller's own flags come
// from one projection-only aggregation. An admin or instructor (staff for
// some or all rows), and any `?fields=` request, keep the original path.
async function loadTrackList(features, queryString, requestingUser) {
  const slim =
    !queryString.fields &&
    !policy.isAdmin(requestingUser) &&
    !policy.isInstructorRole(requestingUser);
  if (slim) features.query.select(ROSTER_EXCLUSION);

  const tracks = await features.query;
  const meta = slim
    ? await policy.loadMembership(
        Track,
        tracks.map((t) => t._id),
        requestingUser,
        MEMBERSHIP_FLAGS,
      )
    : null;

  return tracks.map((t) => {
    const obj = t.toObject();
    if (meta) return { ...obj, ...meta.get(t._id.toString()) };
    const isStaff = policy.canManageTrack(requestingUser, obj);
    return policy.redactMembership(
      obj,
      requestingUser,
      isStaff,
      MEMBERSHIP_FLAGS,
    );
  });
}

/**
 * Get all tracks with advanced filtering, sorting, and pagination
 * @param {Object} query - Express query object with filters, sort, page, limit
 * @returns {Promise<{tracks: Array, total: Number}>} Paginated tracks and total count
 */
exports.getAllTracks = async (query, requestingUser = null) => {
  // #2.6: `?instructor=:userId` means "tracks this user leads OR
  // co-instructs". It is taken out of the generic query-string filter
  // (which would match the lead only) and validated here.
  const { instructor: instructorFilter, ...restQuery } = query || {};
  if (
    instructorFilter !== undefined &&
    !(
      typeof instructorFilter === 'string' &&
      /^[0-9a-fA-F]{24}$/.test(instructorFilter)
    )
  ) {
    throw new AppError('Instructor must be a valid MongoDB ID', 400);
  }

  // Q5/Q2: previously returned every track regardless of `published`,
  // to any caller including anonymous — a draft "[TEST]" track's title
  // was fully public. Admins see everything; the public sees published
  // tracks; an instructor also sees the drafts they can manage (lead or
  // co-instructor, by their CURRENT role - stage 4).
  const features = new APIFeatures(Track.find(), restQuery, Track)
    .filter(
      policy.andFilters(
        policy.manageableListFilter(requestingUser, null, 'track'),
        instructorFilter
          ? {
              $or: [
                { instructor: instructorFilter },
                { instructors: instructorFilter },
              ],
            }
          : {},
      ),
    )
    .search(['title', 'description'])
    .sort()
    .limitFields();

  // ✅ AWAIT the async paginate method
  await features.paginate();

  // Q7: previously returned every track's raw `students`/`pendingStudents`/
  // `pendingLeaves` ID arrays to literally any caller, including
  // anonymous — replaced with `studentCount` (already a schema virtual)
  // plus `isEnrolled`/`isPending`/`isPendingLeave` for the requester.
  // Each track's own instructor (or an admin) still gets the full arrays.
  const sanitized = await loadTrackList(features, restQuery, requestingUser);

  return {
    tracks: sanitized || [], // Ensure it's always an array
    total: features.totalDocs || 0,
    pagination: features.pagination, // Include pagination info
  };
};

/**
 * Get a single track by ID with optional session population
 * @param {string} trackId - MongoDB track ID
 * @param {boolean} populateSessions - Whether to populate sessions
 * @returns {Promise<Track>} Track document
 * @throws {AppError} 404 if track not found
 */
exports.getTrackById = async (trackId, populateSessions = false) => {
  let query = Track.findById(trackId);

  if (populateSessions) {
    query = query.populate({
      path: 'sessions',
      select: 'title description duration level published startDate',
      match: { published: true },
    });
  }

  const track = await query;
  if (!track) {
    throw new AppError('No track found with that ID', 404);
  }
  return track;
};

/**
 * Get detailed track information with full population
 * @param {string} trackId - MongoDB track ID
 * @returns {Promise<Track>} Fully populated track with sessions and students
 * @throws {AppError} 404 if track not found
 */
exports.getTrackDetails = async (trackId, requestingUser = null) => {
  // Stage 3B: the roster arrays are not loaded with the track. Enrollment is
  // an `exists`, the counts and pending flags come from one aggregation,
  // and the arrays themselves are fetched only for a caller who receives
  // them.
  const track = await Track.findById(trackId)
    .select(ROSTER_EXCLUSION)
    .populate({
      path: 'courses',
      select: 'title description level',
      match: { published: true },
    })
    .populate({
      path: 'sessions',
      select: 'title description duration level published startDate students',
      match: { published: true },
    });

  if (!track) {
    throw new AppError('No track found with that ID', 404);
  }

  // "Owner" now means lead OR co-instructor, by current role (stage 4).
  const isOwner = policy.isTrackStaff(track, requestingUser);
  const isAdmin = policy.isAdmin(requestingUser);

  if (!track.published && !isOwner && !isAdmin) {
    throw new AppError('No track found with that ID', 404);
  }

  const isEnrolled =
    !!requestingUser &&
    !!(await Track.exists({ _id: trackId, students: requestingUser.id }));
  const isStaff = isOwner || isAdmin;

  // Q7: `pendingStudents`/`pendingLeaves` had NO gate at all before this —
  // anyone who could see the track (including an enrolled-but-not-staff
  // student) got the raw applicant/leave-request ID lists. Only the
  // track's own instructor or an admin is "staff" for these two fields —
  // being merely enrolled doesn't qualify, unlike for `students` above.
  // Everyone else gets `isPending`/`isPendingLeave` for their own status
  // instead. `students`, when NOT populated above (i.e. the caller is
  // none of owner/admin/enrolled), still needs the same raw-ID-array fix
  // `getAllTracks` already got — replaced with `studentCount` (schema
  // virtual, already present) + `isEnrolled: false`.
  const trackObj = track.toObject();
  trackObj.isEnrolled = isEnrolled;

  if (isStaff) {
    // Staff: the roster plus the raw pending arrays.
    const rosters = await Track.findById(trackId)
      .select('students pendingStudents pendingLeaves')
      .populate({ path: 'students', select: 'name email photo' });
    const loaded = rosters ? rosters.toObject() : {};
    trackObj.students = loaded.students || [];
    trackObj.pendingStudents = loaded.pendingStudents || [];
    trackObj.pendingLeaves = loaded.pendingLeaves || [];
    trackObj.studentCount = trackObj.students.length;
    return trackObj;
  }

  // Everyone else: counts and own-status flags only...
  const meta = await policy.loadMembership(
    Track,
    [trackId],
    requestingUser,
    MEMBERSHIP_FLAGS,
  );
  const counts = meta.get(trackId.toString()) || {};
  trackObj.studentCount = counts.studentCount || 0;
  trackObj.isPending = !!counts.isPending;
  trackObj.isPendingLeave = !!counts.isPendingLeave;

  // ...plus the populated roster for an enrolled student.
  if (isEnrolled) {
    const rosters = await Track.findById(trackId)
      .select('students')
      .populate({ path: 'students', select: 'name email photo' });
    trackObj.students = rosters ? rosters.toObject().students : [];
  }

  return trackObj;
};

/**
 * Update track information
 * @param {string} trackId - MongoDB track ID
 * @param {Object} updateBody - Fields to update
 * @returns {Promise<Track>} Updated track document
 * @throws {AppError} 404 if track not found, 400 if validation fails
 */
/**
 * #1.2: public catalog of a track's sessions, no media/URLs — just enough
 * for a visitor to see what the track covers before enrolling.
 * @param {string} trackId
 * @returns {Promise<Object[]>} sessions: [{ _id, title, description, startDate, duration }]
 * @throws {AppError} 404 if the track doesn't exist
 */
exports.getSessionCatalog = async (trackId) => {
  // Package 2: public endpoint - a draft track, and draft sessions inside
  // a published track, are not part of the public catalog (Q2/Q5).
  const track = await Track.findById(trackId).select('_id published');
  if (!track || !track.published) {
    throw new AppError('No track found with that ID', 404);
  }

  const sessions = await Session.find({
    tracks: trackId,
    published: true,
  }).select('title description startDate duration');

  return sessions;
};

exports.updateTrack = async (trackId, updateBody, requestingUserId) => {
  if (updateBody.instructor) {
    await assertValidInstructor(updateBody.instructor);
  }

  // If the update touches courses or sessions, validate BEFORE saving
  if (updateBody.courses !== undefined || updateBody.sessions !== undefined) {
    const existing = await Track.findById(trackId);
    if (!existing) throw new AppError('No track found with that ID', 404);

    const mergedCourses = updateBody.courses ?? existing.courses;
    const mergedSessions = updateBody.sessions ?? existing.sessions;

    if (mergedCourses.length === 0 && mergedSessions.length === 0) {
      throw new AppError(
        'A track must have at least one course or one session',
        400,
      );
    }
  }

  const track = await Track.findById(trackId);

  if (!track) throw new AppError('No track found', 404);

  track.set(await withConsistentInstructors(track, updateBody));

  await track.save(); // triggers pre('save') validation

  await track.populate([
    { path: 'instructor', select: 'name photo' },
    { path: 'instructors', select: 'name photo' },
  ]);

  recordActivity({
    userId: requestingUserId,
    action: 'updated_track',
    targetModel: 'Track',
    targetId: trackId,
  });

  return track;
};

/**
 * Permanently delete a track. Courses are orphaned (track: null) and sessions
 * recalculate isStandalone; they are NOT cascade-deleted.
 * @param {string} trackId - MongoDB track ID
 * @returns {Promise<null>} Null on successful deletion
 * @throws {AppError} 404 if track not found
 */
exports.deleteTrack = async (trackId, requestingUserId) => {
  // Delegates to cascade.service's transactional implementation: deleting a
  // track touches assignments, weekly tasks, reviews, courses, sessions,
  // and every enrolled student's user document, so it needs to be all-or-
  // nothing rather than a sequence of independent writes.
  await cascade.deleteTrackCascade(trackId);
  recordActivity({
    userId: requestingUserId,
    action: 'deleted_track',
    targetModel: 'Track',
    targetId: trackId,
  });
  return null;
};

// ===================================================================
// 🔗 COURSE-TRACK RELATIONSHIP MANAGEMENT
// ===================================================================

// #4.1 / #4.2 - keeping both sides of the track relationships in sync.
//
// A track<->course link lives in TWO places (Track.courses and
// Course.track) and a track<->session link lives in TWO places
// (Track.sessions and Session.tracks). `sessionCount`/`courseCount` are
// virtuals over the TRACK side arrays, while `GET /sessions/track/:id`,
// `GET /courses/track/:id` and enrollment sync all read the CHILD side -
// so when the two sides disagree the frontend sees "3 sessions linked but
// sessionCount: 0" (BACKEND-REQUESTS-2 #4.1/#4.2).
//
// The four functions below used to load both documents, mutate them in
// memory and call `.save()` on each inside a Promise.all. That is fragile
// in three specific ways, all fixed here:
//   1. Not atomic across documents, and `.save()` re-validates the WHOLE
//      document - so a legacy record with one now-invalid field (e.g. a
//      session URL that predates the stricter trusted-host check) made the
//      second save fail AFTER the first had already committed, leaving the
//      link half-written with no way to repair it through the API.
//   2. The "already in this track" guard only looked at the track side, so
//      a one-sided link could never be repaired (the session side got a
//      duplicate pushed instead) or was stuck returning 400 forever.
//   3. Read-modify-write on whole arrays loses updates under concurrent
//      requests.
// Now every write is a single-document atomic operator ($addToSet / $pull
// / $set) that skips whole-document validation, each step is idempotent,
// and the child side (the side reads and enrollment trust) is written
// first. If a request dies between the two writes, repeating it repairs
// the link instead of failing; `scripts/reconcileTrackSessions.js` and
// `scripts/reconcileTrackCourses.js` repair records that are already
// desynced in the database.

// True if `list` (array of ObjectIds) contains `id`.
function listHasId(list, id) {
  const target = id.toString();
  return (list || []).some((item) => item.toString() === target);
}

// A student added to / removed from a track is (un)enrolled in its content
// by the functions below; these helpers keep that bookkeeping in one place.
async function enrollTrackStudentsInCourse(track, courseId) {
  if (!track.students?.length) return;
  await Course.updateOne(
    { _id: courseId },
    { $addToSet: { students: { $each: track.students } } },
  );
  await User.updateMany(
    { _id: { $in: track.students } },
    { $addToSet: { enrolledCourses: courseId } },
  );
}

async function enrollTrackStudentsInSession(track, sessionId) {
  if (!track.students?.length) return;
  await Session.updateOne(
    { _id: sessionId },
    { $addToSet: { students: { $each: track.students } } },
  );
  await User.updateMany(
    { _id: { $in: track.students } },
    { $addToSet: { enrolledSessions: sessionId } },
  );
}

/**
 * Add a course to a track, keeping Track.courses and Course.track in sync.
 * Idempotent and self-repairing: if only one side of the link exists (a
 * desynced record) the missing side is written instead of erroring.
 * @param {string} trackId - MongoDB track ID
 * @param {string} courseId - MongoDB course ID
 * @returns {Promise<Track>} The updated track
 * @throws {AppError} 404 if track/course not found, 400 if the link is
 *   already fully in place
 */
exports.addCourseToTrack = async (trackId, courseId) => {
  const [track, course] = await Promise.all([
    Track.findById(trackId),
    Course.findById(courseId),
  ]);

  if (!track) throw new AppError('No track found', 404);
  if (!course) throw new AppError('No course found', 404);

  const onTrackSide = listHasId(track.courses, courseId);
  const onCourseSide = refId(course, 'track') === trackId.toString();

  if (onTrackSide && onCourseSide) {
    throw new AppError('Course already in this track', 400);
  }

  // A course belongs to exactly one track. Detach it from EVERY other
  // track that still lists it (not just the one course.track points at),
  // otherwise a stale reference stays behind and anything trusting that
  // array (e.g. deleteTrack orphaning its courses) would wrongly act on a
  // course it no longer owns.
  await Track.updateMany(
    { _id: { $ne: trackId }, courses: courseId },
    { $pull: { courses: courseId } },
  );

  // Child side first (what reads and enrollment trust), then the parent.
  await Course.updateOne({ _id: courseId }, { $set: { track: trackId } });
  await Track.updateOne({ _id: trackId }, { $addToSet: { courses: courseId } });

  // Enroll existing track students into the new course
  await enrollTrackStudentsInCourse(track, courseId);

  return Track.findById(trackId);
};

/**
 * Add a session to a track, keeping Track.sessions and Session.tracks in
 * sync. Idempotent and self-repairing, like addCourseToTrack.
 * @param {string} trackId - MongoDB track ID
 * @param {string} sessionId - MongoDB session ID
 * @returns {Promise<Track>} Updated track with new session
 * @throws {AppError} 404 if track/session not found, 400 if the link is
 *   already fully in place
 */
exports.addSessionToTrack = async (trackId, sessionId) => {
  const [track, session] = await Promise.all([
    Track.findById(trackId),
    Session.findById(sessionId),
  ]);

  if (!track) throw new AppError('No track found', 404);
  if (!session) throw new AppError('No session found', 404);

  const onTrackSide = listHasId(track.sessions, sessionId);
  const onSessionSide = listHasId(session.tracks, trackId);

  if (onTrackSide && onSessionSide) {
    throw new AppError('Session already in this track', 400);
  }

  // Child side first. $addToSet means a repeat (or a half-written earlier
  // attempt) can never produce a duplicate entry. A session linked to a
  // track is by definition not standalone.
  await Session.updateOne(
    { _id: sessionId },
    { $addToSet: { tracks: trackId }, $set: { isStandalone: false } },
  );
  await Track.updateOne(
    { _id: trackId },
    { $addToSet: { sessions: sessionId } },
  );

  // Enroll existing track students into the new session
  await enrollTrackStudentsInSession(track, sessionId);

  return Track.findById(trackId);
};

/**
 * Remove a course from a track, keeping both sides in sync. The course is
 * orphaned (track = null), not deleted.
 * @param {string} trackId - MongoDB track ID
 * @param {string} courseId - MongoDB course ID
 * @returns {Promise<Track>} Updated track without the course
 * @throws {AppError} 404 if track not found, 400 if removing it would
 *   leave the track with no course or session
 */
exports.removeCourseFromTrack = async (trackId, courseId) => {
  const track = await Track.findById(trackId);
  if (!track) throw new AppError('No track found', 404);

  // Check: track still has content? (computed before any write, so a
  // rejected removal changes nothing)
  const remainingCourses = (track.courses || []).filter(
    (id) => id.toString() !== courseId.toString(),
  );
  if (remainingCourses.length === 0 && (track.sessions || []).length === 0) {
    throw new AppError(
      'Cannot remove last course: track must have at least one course or session',
      400,
    );
  }

  await Track.updateOne({ _id: trackId }, { $pull: { courses: courseId } });

  const course = await Course.findById(courseId);
  if (course) {
    const currentTrackId = refId(course, 'track');

    // Only orphan the course if it actually belongs to THIS track (or to
    // none - a desynced record). If it belongs to a different track,
    // removing it here must only clean up this track's stale reference;
    // it must not detach the course from the track that really owns it or
    // unenroll that track's students.
    if (!currentTrackId || currentTrackId === trackId.toString()) {
      if (currentTrackId) {
        await Course.updateOne({ _id: courseId }, { $set: { track: null } });
      }

      // Unenroll the track's current students from the now-detached
      // course - symmetric with addCourseToTrack, which auto-enrolls
      // existing track students into a course when it's added. Without
      // this, students stay enrolled in a course that's no longer gated
      // behind the track they joined, with no way to notice or clean it up.
      //
      // Known limitation: a student who is both a track member *and*
      // separately/directly enrolled in this exact course will also be
      // unenrolled here, since enrollment doesn't currently record *how* a
      // student got access (track vs. direct). Fixing that fully needs a
      // provenance field on enrollment - a larger, separately-tracked
      // change.
      if (track.students?.length) {
        await Course.updateOne(
          { _id: courseId },
          { $pull: { students: { $in: track.students } } },
        );
        await User.updateMany(
          { _id: { $in: track.students } },
          { $pull: { enrolledCourses: courseId } },
        );
      }
    }
  }

  return Track.findById(trackId);
};

/**
 * Remove a session from a track, keeping both sides in sync.
 * @param {string} trackId - MongoDB track ID
 * @param {string} sessionId - MongoDB session ID
 * @returns {Promise<Track>} Updated track without the session
 * @throws {AppError} 404 if track not found, 400 if removing it would
 *   leave the track with no course or session
 */
exports.removeSessionFromTrack = async (trackId, sessionId) => {
  const track = await Track.findById(trackId);
  if (!track) throw new AppError('No track found', 404);

  // Check: track still has content? (computed before any write)
  const remainingSessions = (track.sessions || []).filter(
    (id) => id.toString() !== sessionId.toString(),
  );
  if (remainingSessions.length === 0 && (track.courses || []).length === 0) {
    throw new AppError(
      'Cannot remove last session: track must have at least one course or session',
      400,
    );
  }

  await Track.updateOne({ _id: trackId }, { $pull: { sessions: sessionId } });

  // `new: true` so isStandalone is computed from the session's tracks AS
  // THEY ARE NOW (after this pull), not from a stale read.
  const session = await Session.findByIdAndUpdate(
    sessionId,
    { $pull: { tracks: trackId } },
    { new: true },
  );
  if (session) {
    // true if it is also not in another track or a course
    await Session.updateOne(
      { _id: sessionId },
      { $set: { isStandalone: !session.tracks?.length && !session.course } },
    );

    // Unenroll this track's current students from the session - symmetric
    // with addSessionToTrack, which auto-enrolls existing track students
    // into a session when it's added. Without this, students stay
    // enrolled in a session that's no longer reachable via the track they
    // joined, with no way to notice or clean it up.
    //
    // Known limitation: a student who is both a track member *and*
    // separately/directly enrolled in this exact session will also be
    // unenrolled here, since enrollment doesn't currently record *how* a
    // student got access (track vs. direct). Fixing that fully needs a
    // provenance field on enrollment - a larger, separately-tracked
    // change.
    if (track.students?.length) {
      await Session.updateOne(
        { _id: sessionId },
        { $pull: { students: { $in: track.students } } },
      );
      await User.updateMany(
        { _id: { $in: track.students } },
        { $pull: { enrolledSessions: sessionId } },
      );
    }
  }

  return Track.findById(trackId);
};

// ===================================================================
// 🔍 ADVANCED QUERIES & ANALYTICS
// ===================================================================

// Package 2: shared by the two track sub-lists below. The Q5 draft rule
// (published only; staff also get the drafts they manage; admins all) plus
// the Q7 redaction, the same as getAllTracks.
async function runTrackSubList(query, requestingUser, extra) {
  const features = new APIFeatures(Track.find(), query, Track)
    .filter(
      policy.andFilters(
        policy.manageableListFilter(requestingUser, null, 'track'),
        extra,
      ),
    )
    .search(['title', 'description'])
    .sort()
    .limitFields();

  await features.paginate();

  const sanitized = await loadTrackList(features, query, requestingUser);

  return {
    tracks: sanitized,
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
}

/**
 * Get all tracks created by a specific instructor
 * @param {string} instructorId - MongoDB user ID (instructor)
 * @param {Object} query - Filtering and pagination options
 * @param {Object|null} requestingUser - caller (null = anonymous)
 * @returns {Promise<{tracks: Array, total: Number}>} Instructor's tracks
 */
exports.getTracksByInstructor = (instructorId, query, requestingUser = null) =>
  runTrackSubList(query, requestingUser, { instructor: instructorId });

/**
 * Get all tracks a student is enrolled in
 * @param {string} studentId - MongoDB user ID (student)
 * @param {Object} query - Filtering and pagination options
 * @param {Object|null} requestingUser - caller (null = anonymous)
 * @returns {Promise<{tracks: Array, total: Number}>} Student's enrolled tracks
 *
 * A track the student is enrolled in that was later unpublished is hidden
 * from this list (same as every list and the detail endpoint), unless the
 * caller manages it or is an admin.
 */
exports.getTracksByStudent = (studentId, query, requestingUser = null) =>
  runTrackSubList(query, requestingUser, { students: studentId });

/**
 * Get most popular tracks based on student enrollment count
 * @param {number} limit - Number of tracks to return (default: 10)
 * @returns {Promise<Array>} Array of popular tracks with instructor data
 */
exports.getPopularTracks = async (limit = 10) => {
  const tracks = await Track.aggregate([
    {
      $addFields: {
        studentCount: { $size: '$students' },
      },
    },
    {
      $match: {
        published: true,
        studentCount: { $gt: 0 },
      },
    },
    {
      $sort: { studentCount: -1 },
    },
    {
      $limit: limit,
    },
    // Stage 4: `instructor` and `instructors` are looked up with an
    // explicit { _id, name, photo } projection - the same shape every other
    // GET /tracks* response now has (no email/role on a public endpoint).
    {
      $lookup: {
        from: 'users',
        let: { leadId: '$instructor' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$leadId'] } } },
          { $project: { name: 1, photo: 1 } },
        ],
        as: 'instructor',
      },
    },
    {
      $unwind: '$instructor',
    },
    {
      $lookup: {
        from: 'users',
        let: { coIds: { $ifNull: ['$instructors', []] } },
        pipeline: [
          { $match: { $expr: { $in: ['$_id', '$$coIds'] } } },
          { $project: { name: 1, photo: 1 } },
        ],
        as: 'instructors',
      },
    },
    {
      $project: {
        // Q7: this endpoint is fully public (no auth on the route, no
        // requestingUser param here to compute isEnrolled/isPending
        // against) — an aggregation pipeline also bypasses Mongoose's
        // toObject()/virtuals machinery entirely, so `policy.
        // redactMembership()` doesn't apply here the way it does for
        // getAllTracks/getTrackDetails. studentCount was already added
        // above via $addFields; the raw arrays are unconditionally
        // excluded since there's no legitimate "staff" viewer of a
        // public leaderboard endpoint.
        students: 0,
        pendingStudents: 0,
        pendingLeaves: 0,
      },
    },
  ]);

  return tracks;
};

/**
 * Get track statistics and analytics
 * @param {string} trackId - MongoDB track ID
 * @returns {Promise<Object>} Track analytics including completion rates, engagement
 */
exports.getTrackAnalytics = async (trackId) => {
  const track = await Track.findById(trackId);
  if (!track) {
    throw new AppError('No track found with that ID', 404);
  }

  // Basic analytics - can be enhanced with more complex aggregations
  const analytics = {
    totalStudents: track.students.length,
    totalSessions: track.sessions.length,
    enrollmentRate: track.students.length, // Could be compared to platform average
    completionRate: 0, // Would require session completion tracking
    averageEngagement: 0, // Would require engagement metrics
  };

  return analytics;
};
