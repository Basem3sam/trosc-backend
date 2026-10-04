const Assignment = require('../models/assignment.model');
const Track = require('../models/track.model');
const Course = require('../models/course.model');
const Session = require('../models/session.model');
const AppError = require('../utils/AppError');
const policy = require('./policy.service');
const { recordActivity } = require('./activityLog.service');

// Each directly-reviewable/assignable resource type: its Mongoose model,
// the field on Assignment that stores the reference, and a label for
// error messages.
const RESOURCE_CONFIG = {
  course: { Model: Course, field: 'course', label: 'course' },
  session: { Model: Session, field: 'session', label: 'session' },
};

function getConfig(resourceType) {
  const config = RESOURCE_CONFIG[resourceType];
  if (!config) {
    throw new Error(`Unknown assignable resource type: ${resourceType}`);
  }
  return config;
}

function assertCanView(resource, label, requestingUser) {
  if (requestingUser.role === 'student') {
    const isEnrolled = resource.students.some(
      (studentId) => studentId.toString() === requestingUser.id,
    );
    if (!isEnrolled) {
      throw new AppError(
        `Only enrolled students can view this ${label}'s assignments`,
        403,
      );
    }
  }
  // admin and instructor roles pass through without an enrollment check,
  // matching how course/track creation is gated by role only elsewhere.
}

// Staff for a given assignment = everyone who can manage it under the
// stage-4 policy (policy.service.js): an admin, the current instructor of
// its parent course/session, or a lead/co-instructor of the parent's
// track - the same people who can open GET /assignments/:id and grade it.
// Deliberately NOT "any instructor", and NOT the assignment's stored
// `instructor` or `createdBy`: an instructor who does not manage this
// assignment gets no submission information about it. `authority` comes
// from policy.resolveManageableParents(), computed once per request for
// all of a list's parents (no query per assignment).
function isAssignmentStaff(plain, authority) {
  return policy.isStaffOfAssignmentParent(authority, plain);
}

// Strip every student's raw `submissions` from every caller and attach
// only the requesting user's own submission as `mySubmission`, so this
// stays a safe endpoint for students to hit (no classmates' files/grades
// leaked).
//
// #3.2: for staff of that assignment, also attach two counts computed from
// the same in-memory array (no extra queries) so the Studio can render
// "3 submissions · 2 to grade" without calling GET /assignments/:id once
// per assignment. Counts only - never identities, files or grades.
//   submissionCount - how many students have submitted
//   ungradedCount   - how many of those have no grade yet
async function shapeAssignmentsForCaller(assignments, requestingUser) {
  const authority = await policy.resolveManageableParents({}, requestingUser, {
    courseIds: assignments.map((a) => a.course).filter(Boolean),
    sessionIds: assignments.map((a) => a.session).filter(Boolean),
  });

  return assignments.map((assignment) => {
    const plain = assignment.toObject();
    const submissions = plain.submissions || [];
    const mySubmission =
      submissions.find((s) => s.student.toString() === requestingUser.id) ||
      null;

    const shaped = {
      ...plain,
      submissions: undefined,
      mySubmission,
    };

    if (isAssignmentStaff(plain, authority)) {
      shaped.submissionCount = submissions.length;
      shaped.ungradedCount = submissions.filter(
        (s) => s.grade === undefined || s.grade === null,
      ).length;
    }

    return shaped;
  });
}

/**
 * Get all assignments directly attached to a single course or session.
 * Each assignment includes `mySubmission`; staff of that assignment (admin,
 * the parent's current instructor, or its track's lead/co-instructors) also
 * get `submissionCount` / `ungradedCount` (#3.2).
 * @param {'course'|'session'} resourceType
 * @param {string} resourceId
 * @param {Object} requestingUser - req.user (id, role)
 * @returns {Promise<Assignment[]>}
 */
exports.getResourceAssignments = async (
  resourceType,
  resourceId,
  requestingUser,
) => {
  const { Model, field, label } = getConfig(resourceType);

  const resource = await Model.findById(resourceId).select('students');
  if (!resource) {
    throw new AppError(`No ${label} found with that ID`, 404);
  }
  assertCanView(resource, label, requestingUser);

  const assignments = await Assignment.find({ [field]: resourceId })
    .sort({ deadline: 1 })
    .populate('course', 'title')
    .populate('session', 'title')
    .populate('instructor', 'name photo');

  return shapeAssignmentsForCaller(assignments, requestingUser);
};

/**
 * Get every assignment across all courses in a track, PLUS every
 * assignment on any standalone session mounted directly on the track
 * (i.e. not part of a course). Each assignment includes `mySubmission`;
 * staff of that assignment also get `submissionCount` / `ungradedCount`.
 *
 * Access: admin, instructor (any), or a student enrolled in the track.
 *
 * @param {string} trackId
 * @param {Object} requestingUser - req.user (id, role)
 * @returns {Promise<Assignment[]>}
 */
exports.getTrackAssignments = async (trackId, requestingUser) => {
  const track = await Track.findById(trackId).select(
    'students courses sessions',
  );
  if (!track) {
    throw new AppError('No track found with that ID', 404);
  }
  assertCanView(track, 'track', requestingUser);

  const assignments = await Assignment.find({
    $or: [
      { course: { $in: track.courses } },
      { session: { $in: track.sessions } },
    ],
  })
    .sort({ deadline: 1 })
    .populate('course', 'title')
    .populate('session', 'title')
    .populate('instructor', 'name photo');

  return shapeAssignmentsForCaller(assignments, requestingUser);
};

/**
 * Create a new assignment for a course or session.
 * @param {'course'|'session'} resourceType
 * @param {string} resourceId
 * @param {string} instructorId - req.user.id (the caller; becomes createdBy)
 * @param {Object} data - { title, description, deadline, attachments }
 * @returns {Promise<Assignment>}
 */
exports.createAssignment = async (
  resourceType,
  resourceId,
  instructorId,
  data,
) => {
  const { Model, field, label } = getConfig(resourceType);

  const resource = await Model.findById(resourceId).select('instructor');
  if (!resource) {
    throw new AppError(`No ${label} found with that ID`, 404);
  }

  // Stage 4 (#4A.5): `instructor` is the PARENT's current instructor, so it
  // stays meaningful for display when an admin or a track co-instructor
  // creates the assignment on someone else's course/session. (It is not
  // used for authorization - that comes from the parent, see
  // policy.service.js.) `createdBy` below is the caller. `instructorId`
  // (the caller) is the fallback if the parent has no resolvable instructor.
  const parentInstructor = resource.instructor?._id || resource.instructor;

  const assignment = await Assignment.create({
    ...data,
    [field]: resourceId,
    instructor: parentInstructor || instructorId,
    // Q6: set once, at creation, and never touched again by any update
    // path — pure historical attribution, distinct from `instructor`
    // (the current-authority field) even though they start out equal.
    createdBy: instructorId,
  });

  recordActivity({
    userId: instructorId,
    action: 'created_assignment',
    targetModel: 'Assignment',
    targetId: assignment._id,
  });

  return assignment;
};

/**
 * #1.5: single assignment with its submissions, for staff. Management
 * rights (admin / parent's instructor / track lead or co-instructor) are
 * enforced by the requireManage middleware before this runs — students never reach this.
 * @param {string} assignmentId
 * @returns {Promise<Object>} the assignment, submissions populated (student
 *   name/email/photo), with each submission's raw `file` URL stripped —
 *   see assignmentSubmission.service.js#getSubmissionFile (#1.3) for the
 *   one path that's allowed to expose it.
 * @throws {AppError} 404 if the assignment doesn't exist
 */
exports.getAssignmentById = async (assignmentId) => {
  const assignment = await Assignment.findById(assignmentId)
    .populate('course', 'title')
    .populate('session', 'title')
    .populate('instructor', 'name photo')
    .populate('submissions.student', 'name email photo');

  if (!assignment) {
    throw new AppError('No assignment found with that ID', 404);
  }

  const plain = assignment.toObject();
  plain.submissions = plain.submissions.map(({ file, ...rest }) => ({
    ...rest,
    hasFile: !!file,
  }));

  return plain;
};

/**
 * Update an assignment's title, description, deadline, and/or attachments.
 * Management rights are enforced by the requireManage middleware before
 * this runs.
 * @param {string} assignmentId
 * @param {Object} data
 * @returns {Promise<Assignment>}
 */
exports.updateAssignment = async (assignmentId, data, requestingUserId) => {
  const assignment = await Assignment.findByIdAndUpdate(assignmentId, data, {
    new: true,
    runValidators: true,
  });
  if (!assignment) {
    throw new AppError('No assignment found with that ID', 404);
  }

  recordActivity({
    userId: requestingUserId,
    action: 'updated_assignment',
    targetModel: 'Assignment',
    targetId: assignmentId,
  });

  return assignment;
};

/**
 * Delete an assignment (and all of its submissions with it). Management
 * rights are enforced by the requireManage middleware before this runs.
 * @param {string} assignmentId
 */
exports.deleteAssignment = async (assignmentId, requestingUserId) => {
  const assignment = await Assignment.findByIdAndDelete(assignmentId);
  if (!assignment) {
    throw new AppError('No assignment found with that ID', 404);
  }

  recordActivity({
    userId: requestingUserId,
    action: 'deleted_assignment',
    targetModel: 'Assignment',
    targetId: assignmentId,
  });
};
