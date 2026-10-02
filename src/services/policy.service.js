// src/services/policy.service.js
//
// Centralized READ/VISIBILITY policy layer (BACKEND-REQUESTS-2 Q10, stage 1).
//
// Goal: every place that decides "can this caller see this draft?" or
// "which documents should a list endpoint even return?" goes through the
// same handful of functions instead of re-deriving the logic inline in
// each service (which is how session.service.js's list endpoints ended up
// inconsistent with getSessionById — see BACKEND-REQUESTS-2 #1.1/#1.2).
//
// Stages 1-2 scope: READ/VISIBILITY ("can this caller see this resource,
// and should a draft be included in a list at all").
// Stage 4 (BACKEND-REQUESTS-2 Q3/Q10, round-2 section 2) appends the
// MANAGEMENT permissions (create, edit, delete, grade, ...) in a clearly
// separated section at the bottom of this file, so tracks, courses,
// sessions, assignments and weekly tasks all decide "can this caller
// manage it" in one place instead of in `checkOwnership`.
//
// Authorization principle carried through from the very first thing this
// file does (BACKEND-REQUESTS-2 Q3): every check here is based on the
// user's CURRENT role and the resource's CURRENT owner field
// (`instructor`), never on a historical/creation record. There is no
// `createdBy`-based check anywhere in this file, intentionally — when
// `createdBy` is introduced (Q6, a later stage), it must stay pure
// historical attribution and never feed into any function below.

const mongoose = require('mongoose');
const Track = require('../models/track.model');
const Course = require('../models/course.model');
const Session = require('../models/session.model');
const Assignment = require('../models/assignment.model');
const WeeklyTask = require('../models/weeklytask.model');

/**
 * @param {{ role?: string } | null | undefined} user
 * @returns {boolean}
 */
function isAdmin(user) {
  return user?.role === 'admin';
}

/**
 * True if `user` is the current holder of `resource[ownerField]` — a
 * Mongoose ObjectId, a populated sub-document, or a bare string are all
 * accepted so callers can pass either a lean/populated document or a
 * plain object without normalizing it first.
 *
 * @param {Object} resource
 * @param {{ id?: string } | null | undefined} user
 * @param {string} [ownerField='instructor']
 * @returns {boolean}
 */
function isOwnerOf(resource, user, ownerField = 'instructor') {
  if (!user || !resource) return false;
  const raw = resource[ownerField];
  const ownerId = (raw?._id ?? raw)?.toString();
  return !!ownerId && ownerId === user.id;
}

/**
 * True if `user` is allowed to see a DRAFT (`published: false`) instance
 * of `resource` — currently: an admin, or the resource's own current
 * `ownerField` holder. Round-2 #2.3 (co-instructors / current course or
 * track staff) will broaden this in a later stage without changing this
 * function's signature.
 *
 * @param {Object} resource
 * @param {{ id?: string, role?: string } | null | undefined} user
 * @param {string} [ownerField='instructor']
 * @returns {boolean}
 */
function canViewDraft(resource, user, ownerField = 'instructor') {
  return isAdmin(user) || isOwnerOf(resource, user, ownerField);
}

/**
 * Builds the Mongoose filter a LIST endpoint should AND onto its query so
 * that unpublished (draft) documents never come back to a caller who
 * isn't authorized to see them (BACKEND-REQUESTS-2 Q5's "draft listing
 * behavior" contract):
 *
 *   - admin                → {} (no restriction — sees everything)
 *   - anonymous/public      → { published: true }
 *   - authenticated, non-admin → published:true OR they own the doc
 *     (so an instructor's own draft still shows up in their own list view)
 *
 * @param {{ id?: string, role?: string } | null | undefined} user
 * @param {string} [ownerField='instructor']
 * @returns {Object} a Mongoose-compatible filter
 */
function publishedListFilter(user, ownerField = 'instructor') {
  if (isAdmin(user)) return {};
  if (!user) return { published: true };
  return { $or: [{ published: true }, { [ownerField]: user.id }] };
}

/**
 * Throws-or-passes helper for single-resource GET handlers: mirrors the
 * 404-for-unauthorized-drafts pattern track.service.js#getTrackDetails and
 * course.service.js#getCourseDetails already used, so session.service.js
 * (and anything else) can share the exact same rule instead of
 * reimplementing it. Deliberately returns a boolean rather than throwing
 * itself — callers already have their own AppError message/404 for
 * "not found", and reusing that exact message keeps "doesn't exist" and
 * "exists but you can't see it" indistinguishable to the caller, which is
 * the point (no leaking draft existence via a different error shape).
 *
 * @param {Object} resource - must have a `published` boolean field
 * @param {{ id?: string, role?: string } | null | undefined} user
 * @param {string} [ownerField='instructor']
 * @returns {boolean} true if the caller may view this resource despite it
 *   being a draft (or it isn't a draft at all)
 */
function canViewResource(resource, user, ownerField = 'instructor') {
  if (resource.published) return true;
  return canViewDraft(resource, user, ownerField);
}

// ---------------------------------------------------------------------
// Membership-array redaction (BACKEND-REQUESTS-2 Q7, stage 2)
//
// Track/Course/Session all store membership as raw ObjectId arrays
// (`students`, and on Track only, `pendingStudents`/`pendingLeaves`).
// Detail endpoints already gated the *populated* (name/email/photo)
// version of `students` behind owner/admin/enrolled — but the raw,
// un-populated array underneath was never actually removed for anyone
// else, so an outsider (or even an anonymous caller, on list endpoints)
// still received bare IDs. `pendingStudents`/`pendingLeaves` had no gate
// at all: literally anyone could see who has an application or a leave
// request pending. `isMemberOf`/`redactMembership` below are the one
// place that gets fixed.

/**
 * @param {Array|undefined} list - raw ObjectIds, populated sub-documents,
 *   or a mix; also safely handles `undefined` (field not selected/loaded)
 * @param {{ id?: string } | null | undefined} user
 * @returns {boolean} true if `user.id` appears anywhere in `list`
 */
function isMemberOf(list, user) {
  if (!user || !Array.isArray(list)) return false;
  return list.some((item) => (item?._id ?? item)?.toString() === user.id);
}

/**
 * Mutates and returns a plain object (already `.toObject()`'d, NOT a live
 * Mongoose document — deleting schema paths on a document doesn't
 * reliably stick) so that a caller who isn't staff for this resource
 * never sees its raw membership arrays, only booleans about their own
 * status. Staff (per `isStaffFields`, since different arrays can have
 * different "who's staff for this" answers — see the pendingStudents/
 * pendingLeaves note below) get the object back completely untouched.
 *
 * Each entry in `fields` maps an output flag name to the array field it's
 * derived from, e.g. `{ isEnrolled: 'students', isPending: 'pendingStudents' }`.
 * `studentCount` is deliberately NOT produced here — it's already a
 * schema virtual on Track/Course/Session (`toObject({ virtuals: true })`
 * puts it on `obj` before this function ever runs), so there's nothing
 * for this function to add for it.
 *
 * @param {Object} obj - plain object to redact in place
 * @param {{ id?: string } | null | undefined} user
 * @param {boolean} isStaff - true skips redaction entirely (owner/admin)
 * @param {Object<string,string>} fields - { outputFlagName: arrayFieldName }
 * @returns {Object} `obj`, mutated
 */
function redactMembership(obj, user, isStaff, fields) {
  if (isStaff || !obj) return obj;

  Object.entries(fields).forEach(([flagName, arrayField]) => {
    if (obj[arrayField] === undefined) return;
    obj[flagName] = isMemberOf(obj[arrayField], user);
    delete obj[arrayField];
  });

  return obj;
}

// ---------------------------------------------------------------------
// MANAGEMENT permissions (BACKEND-REQUESTS-2 round-2 #2.3-#2.5, Q3, Q10,
// stage 4)
//
// ONE rule, computed from the caller's CURRENT state on every request:
//
//   allowed  = the caller is an admin, OR
//              the caller's CURRENT role is 'instructor' AND they are one of
//                - the current instructor of the item's course,
//                - the lead (`instructor`) or a co-instructor
//                  (`instructors`) of the item's track,
//                - the item's own current instructor (track/course/session).
//
// There is deliberately NO creator override: `createdBy` is never read
// here (Q3), and an assignment's / weekly task's stored `instructor` is
// never read either - their authority comes from the PARENT course or
// session. A demoted/deactivated user, someone removed from
// `Track.instructors`, or an instructor whose course was reassigned
// therefore loses access on the very next request.
//
// Resolution reads only the few fields it needs through the aggregation
// framework (no find hooks, so no instructor populate) and caches every
// resolved document on `req.policyCache`, so a request that checks the
// same track twice - or a list that shares parents - never re-queries.

const DECISION = Object.freeze({
  ALLOWED: 'allowed',
  DENIED: 'denied',
  MISSING: 'missing',
});

function isInstructorRole(user) {
  return user?.role === 'instructor';
}

function idOf(value) {
  return (value?._id ?? value)?.toString() || null;
}

function toObjectId(id) {
  const raw = idOf(id);
  if (!raw) return null;
  try {
    return new mongoose.Types.ObjectId(raw);
  } catch (err) {
    return null;
  }
}

// --- pure rules (operate on already-resolved plain documents) ---------

/**
 * Lead or co-instructor of `track`, AND currently role 'instructor'.
 * (Admins are handled by the canManage* functions, not here.)
 */
function isTrackStaff(track, user) {
  if (!track || !isInstructorRole(user)) return false;
  return (
    isOwnerOf(track, user, 'instructor') || isMemberOf(track.instructors, user)
  );
}

function canManageTrack(user, track) {
  return isAdmin(user) || isTrackStaff(track, user);
}

function canManageCourse(user, course, track = null) {
  if (isAdmin(user)) return true;
  if (!course || !isInstructorRole(user)) return false;
  return isOwnerOf(course, user, 'instructor') || isTrackStaff(track, user);
}

/**
 * @param {Object} session
 * @param {{ course?: Object|null, courseTrack?: Object|null,
 *   tracks?: Object[] }} [context] - the session's resolved parents
 */
function canManageSession(user, session, context = {}) {
  if (isAdmin(user)) return true;
  if (!session || !isInstructorRole(user)) return false;
  const { course = null, courseTrack = null, tracks = [] } = context;
  return (
    isOwnerOf(session, user, 'instructor') ||
    canManageCourse(user, course, courseTrack) ||
    tracks.some((track) => isTrackStaff(track, user))
  );
}

/**
 * An assignment is managed through its PARENT (course or session) - never
 * through its own `instructor` or `createdBy`.
 * @param {{ type: 'course'|'session', course?: Object, track?: Object,
 *   session?: Object, courseTrack?: Object, tracks?: Object[] }|null} parent
 */
function canManageAssignment(user, parent) {
  if (isAdmin(user)) return true;
  if (!parent) return false;
  if (parent.type === 'course') {
    return canManageCourse(user, parent.course, parent.track);
  }
  return canManageSession(user, parent.session, parent);
}

function canManageWeeklyTask(user, parent) {
  if (isAdmin(user)) return true;
  if (!parent) return false;
  return canManageCourse(user, parent.course, parent.track);
}

// --- resolution + request cache ---------------------------------------

const SOURCES = {
  track: { Model: Track, projection: { instructor: 1, instructors: 1 } },
  course: { Model: Course, projection: { instructor: 1, track: 1 } },
  session: {
    Model: Session,
    projection: { instructor: 1, course: 1, tracks: 1 },
  },
  assignment: { Model: Assignment, projection: { course: 1, session: 1 } },
  weeklyTask: { Model: WeeklyTask, projection: { course: 1 } },
};

// `req` may be any object (services pass `{}`): the cache lives on it.
function cacheFor(req, key) {
  if (!req.policyCache) req.policyCache = {};
  if (!req.policyCache[key]) req.policyCache[key] = new Map();
  return req.policyCache[key];
}

// One aggregation for every id not already cached. Returns the found
// documents (a missing id is remembered as null so it is not re-queried).
async function loadMany(req, kind, ids) {
  const cache = cacheFor(req, kind);
  const wanted = [...new Set(ids.map(idOf).filter(Boolean))];
  const missing = wanted.filter((id) => !cache.has(id));
  const objectIds = missing.map(toObjectId).filter(Boolean);

  if (objectIds.length) {
    const { Model, projection } = SOURCES[kind];
    const docs = await Model.aggregate([
      { $match: { _id: { $in: objectIds } } },
      { $project: projection },
    ]);
    docs.forEach((doc) => cache.set(doc._id.toString(), doc));
  }
  missing.forEach((id) => {
    if (!cache.has(id)) cache.set(id, null);
  });

  return wanted.map((id) => cache.get(id)).filter(Boolean);
}

async function loadOne(req, kind, id) {
  const [doc] = await loadMany(req, kind, [id]);
  return doc || null;
}

// A track reduced to { _id, instructor, instructors } (cached on `req`).
function loadStaffTrack(req, trackId) {
  return loadOne(req, 'track', trackId);
}

async function resolveCourseContext(req, courseId) {
  const course = await loadOne(req, 'course', courseId);
  if (!course) return null;
  const track = course.track ? await loadOne(req, 'track', course.track) : null;
  return { course, track };
}

async function resolveSessionContext(req, sessionId) {
  const session = await loadOne(req, 'session', sessionId);
  if (!session) return null;

  const course = session.course
    ? await loadOne(req, 'course', session.course)
    : null;
  const trackIds = [...(session.tracks || [])];
  if (course?.track) trackIds.push(course.track);

  const found = await loadMany(req, 'track', trackIds);
  const byId = new Map(found.map((track) => [track._id.toString(), track]));
  const tracks = (session.tracks || [])
    .map((id) => byId.get(idOf(id)))
    .filter(Boolean);
  const courseTrack = course?.track
    ? byId.get(idOf(course.track)) || null
    : null;

  return { session, course, courseTrack, tracks };
}

/**
 * Resolves the resource (and its parents) and applies the management rule.
 * @param {Object} req - any object; used as the per-request cache holder
 * @param {{ id?: string, role?: string }|null} user
 * @param {'track'|'course'|'session'|'assignment'|'weeklyTask'} kind
 * @param {string} id
 * @returns {Promise<'allowed'|'denied'|'missing'>}
 */
async function decideManage(req, user, kind, id) {
  const { ALLOWED, DENIED, MISSING } = DECISION;
  const verdict = (ok) => (ok ? ALLOWED : DENIED);

  if (kind === 'track') {
    const track = await loadOne(req, 'track', id);
    return track ? verdict(canManageTrack(user, track)) : MISSING;
  }

  if (kind === 'course') {
    const ctx = await resolveCourseContext(req, id);
    return ctx
      ? verdict(canManageCourse(user, ctx.course, ctx.track))
      : MISSING;
  }

  if (kind === 'session') {
    const ctx = await resolveSessionContext(req, id);
    return ctx ? verdict(canManageSession(user, ctx.session, ctx)) : MISSING;
  }

  if (kind === 'assignment') {
    const assignment = await loadOne(req, 'assignment', id);
    if (!assignment) return MISSING;
    let parent = null;
    if (assignment.course) {
      const ctx = await resolveCourseContext(req, assignment.course);
      parent = ctx && { type: 'course', ...ctx };
    } else if (assignment.session) {
      const ctx = await resolveSessionContext(req, assignment.session);
      parent = ctx && { type: 'session', ...ctx };
    }
    return verdict(canManageAssignment(user, parent));
  }

  if (kind === 'weeklyTask') {
    const task = await loadOne(req, 'weeklyTask', id);
    if (!task) return MISSING;
    const parent = await resolveCourseContext(req, task.course);
    return verdict(canManageWeeklyTask(user, parent));
  }

  throw new Error(`Unknown manageable resource kind: ${kind}`);
}

async function canManage(req, user, kind, id) {
  return (await decideManage(req, user, kind, id)) === DECISION.ALLOWED;
}

/**
 * Batch version for list endpoints (#4A.6): which of these courses and
 * sessions can `user` manage? A constant number of queries however many
 * ids are passed (courses, sessions, the sessions' courses, the tracks).
 * @returns {Promise<{ all: boolean, courses: Set, sessions: Set }>}
 */
async function resolveManageableParents(
  req,
  user,
  { courseIds = [], sessionIds = [] } = {},
) {
  const result = { all: false, courses: new Set(), sessions: new Set() };
  if (isAdmin(user)) {
    result.all = true;
    return result;
  }
  if (!isInstructorRole(user)) return result;

  const [courses, sessions] = await Promise.all([
    loadMany(req, 'course', courseIds),
    loadMany(req, 'session', sessionIds),
  ]);
  const sessionCourses = await loadMany(
    req,
    'course',
    sessions.map((s) => s.course).filter(Boolean),
  );

  const trackIds = [];
  [...courses, ...sessionCourses].forEach((c) => {
    if (c.track) trackIds.push(c.track);
  });
  sessions.forEach((s) => trackIds.push(...(s.tracks || [])));
  const tracks = await loadMany(req, 'track', trackIds);

  const trackById = new Map(tracks.map((t) => [t._id.toString(), t]));
  const courseById = new Map(
    [...courses, ...sessionCourses].map((c) => [c._id.toString(), c]),
  );
  const staffOfTrack = (id) => isTrackStaff(trackById.get(idOf(id)), user);
  const manageCourse = (c) =>
    isOwnerOf(c, user, 'instructor') || staffOfTrack(c.track);

  courses.forEach((c) => {
    if (manageCourse(c)) result.courses.add(c._id.toString());
  });
  sessions.forEach((s) => {
    const parentCourse = s.course ? courseById.get(idOf(s.course)) : null;
    if (
      isOwnerOf(s, user, 'instructor') ||
      (parentCourse && manageCourse(parentCourse)) ||
      (s.tracks || []).some(staffOfTrack)
    ) {
      result.sessions.add(s._id.toString());
    }
  });

  return result;
}

// True if `authority` (from resolveManageableParents) covers the
// assignment's parent course/session. `assignment.course/session` may be an
// ObjectId or a populated { _id, title }.
function isStaffOfAssignmentParent(authority, assignment) {
  if (authority.all) return true;
  const courseId = idOf(assignment.course);
  const sessionId = idOf(assignment.session);
  return (
    (!!courseId && authority.courses.has(courseId)) ||
    (!!sessionId && authority.sessions.has(sessionId))
  );
}

// --- linking / unlinking a course or session to a track (rule 4) ------
//
// LINK   : an admin, OR a caller who is BOTH the item's own current
//          instructor (being staff of its current track is not enough) AND
//          the lead / a co-instructor of the TARGET track.
// UNLINK : an admin, OR staff of that track, OR the item's own instructor.

function canLinkToTrack(user, item, track) {
  if (isAdmin(user)) return true;
  return (
    isInstructorRole(user) &&
    isOwnerOf(item, user, 'instructor') &&
    isTrackStaff(track, user)
  );
}

function canUnlinkFromTrack(user, item, track) {
  if (isAdmin(user)) return true;
  return (
    isInstructorRole(user) &&
    (isOwnerOf(item, user, 'instructor') || isTrackStaff(track, user))
  );
}

/**
 * @param {'course'|'session'} kind
 * @param {'link'|'unlink'} mode
 * @returns {Promise<'allowed'|'denied'|'missing'>}
 */
async function decideLink(req, user, kind, itemId, trackId, mode) {
  const [item, track] = await Promise.all([
    loadOne(req, kind, itemId),
    loadOne(req, 'track', trackId),
  ]);
  if (!item || !track) return DECISION.MISSING;
  const rule = mode === 'link' ? canLinkToTrack : canUnlinkFromTrack;
  return rule(user, item, track) ? DECISION.ALLOWED : DECISION.DENIED;
}

// --- who can see drafts / which drafts a list should include ----------

/**
 * The tracks a caller leads or co-instructs and the courses they manage
 * (their own, plus every course inside those tracks). Empty for anyone who
 * is not currently an instructor. Two queries, cached on `req`.
 * @returns {Promise<{ trackIds: ObjectId[], courseIds: ObjectId[] }>}
 */
async function loadStaffScope(req, user) {
  const empty = { trackIds: [], courseIds: [] };
  const objectId = isInstructorRole(user) ? toObjectId(user.id) : null;
  if (!objectId) return empty;

  const cache = cacheFor(req, 'staffScope');
  if (cache.has(user.id)) return cache.get(user.id);

  const tracks = await Track.aggregate([
    { $match: { $or: [{ instructor: objectId }, { instructors: objectId }] } },
    { $project: { _id: 1 } },
  ]);
  const trackIds = tracks.map((t) => t._id);
  const courses = await Course.aggregate([
    {
      $match: {
        $or: [{ instructor: objectId }, { track: { $in: trackIds } }],
      },
    },
    { $project: { _id: 1 } },
  ]);
  const scope = { trackIds, courseIds: courses.map((c) => c._id) };
  cache.set(user.id, scope);
  return scope;
}

/**
 * Q5 list filter: admin -> everything; anonymous (or a student) ->
 * published only; an instructor -> published PLUS drafts they can manage.
 * Based on the caller's CURRENT role (Q3), so a demoted user's own old
 * drafts stop appearing. Combine with other conditions via andFilters().
 * @param {'track'|'course'|'session'} kind
 */
function manageableListFilter(user, scope, kind) {
  if (isAdmin(user)) return {};
  const conditions = [{ published: true }];
  if (isInstructorRole(user)) {
    if (kind === 'track') {
      conditions.push({ instructor: user.id }, { instructors: user.id });
    } else if (kind === 'course') {
      conditions.push(
        { instructor: user.id },
        { track: { $in: scope.trackIds } },
      );
    } else {
      conditions.push(
        { instructor: user.id },
        { tracks: { $in: scope.trackIds } },
        { course: { $in: scope.courseIds } },
      );
    }
  }
  return conditions.length === 1 ? conditions[0] : { $or: conditions };
}

// ANDs filter fragments into one `$and` (never a bare `$or`, which APIFeatures'
// own `?search=` `$or` would otherwise collide with). Empty fragments vanish.
function andFilters(...parts) {
  const real = parts.filter((part) => part && Object.keys(part).length);
  return real.length ? { $and: real } : {};
}

// Sync, list-level versions of the management rule using a loaded scope.
function isCourseStaffByScope(course, user, scope) {
  if (isAdmin(user)) return true;
  if (!isInstructorRole(user)) return false;
  if (isOwnerOf(course, user, 'instructor')) return true;
  const trackId = idOf(course?.track);
  return !!trackId && scope.trackIds.some((id) => id.toString() === trackId);
}

function isSessionStaffByScope(session, user, scope) {
  if (isAdmin(user)) return true;
  if (!isInstructorRole(user)) return false;
  if (isOwnerOf(session, user, 'instructor')) return true;
  const inTrack = (session.tracks || []).some((t) =>
    scope.trackIds.some((id) => id.toString() === idOf(t)),
  );
  const courseId = idOf(session.course);
  return (
    inTrack ||
    (!!courseId && scope.courseIds.some((id) => id.toString() === courseId))
  );
}

module.exports = {
  isAdmin,
  isOwnerOf,
  canViewDraft,
  canViewResource,
  publishedListFilter,
  isMemberOf,
  redactMembership,
  // stage 4: management permissions
  DECISION,
  isInstructorRole,
  isTrackStaff,
  canManageTrack,
  canManageCourse,
  canManageSession,
  canManageAssignment,
  canManageWeeklyTask,
  canLinkToTrack,
  canUnlinkFromTrack,
  decideLink,
  loadStaffTrack,
  decideManage,
  canManage,
  resolveManageableParents,
  isStaffOfAssignmentParent,
  loadStaffScope,
  manageableListFilter,
  andFilters,
  isCourseStaffByScope,
  isSessionStaffByScope,
};
