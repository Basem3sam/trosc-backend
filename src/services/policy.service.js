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
// Scope for this stage: READ/VISIBILITY only — "can this caller see this
// resource, and should a draft be included in a list at all". It
// deliberately does NOT decide management/mutation permissions (create,
// edit, delete, grade, etc.) — those still go through
// `middlewares/ownership.middleware.js#checkOwnership` for now.
// BACKEND-REQUESTS-2 Q3/Q6 and round-2 section 2 (co-instructors, current-
// authorization-not-historical-creation) extend this same layer to cover
// management permissions in a later stage; this file is written so that
// extension slots in alongside these functions rather than replacing them.
//
// Authorization principle carried through from the very first thing this
// file does (BACKEND-REQUESTS-2 Q3): every check here is based on the
// user's CURRENT role and the resource's CURRENT owner field
// (`instructor`), never on a historical/creation record. There is no
// `createdBy`-based check anywhere in this file, intentionally — when
// `createdBy` is introduced (Q6, a later stage), it must stay pure
// historical attribution and never feed into any function below.

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

module.exports = {
  isAdmin,
  isOwnerOf,
  canViewDraft,
  canViewResource,
  publishedListFilter,
  isMemberOf,
  redactMembership,
};
