const Assignment = require('../models/assignment.model');
const Track = require('../models/track.model');
const Course = require('../models/course.model');
const Session = require('../models/session.model');
const AppError = require('../utils/AppError');

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

// Strip every student's raw `submissions` and attach only the requesting
// user's own submission as `mySubmission`, so this stays a safe endpoint
// for students to hit (no classmates' files/grades leaked).
function withMySubmission(assignments, userId) {
  return assignments.map((assignment) => {
    const plain = assignment.toObject();
    const mySubmission =
      plain.submissions.find((s) => s.student.toString() === userId) || null;

    return {
      ...plain,
      submissions: undefined,
      mySubmission,
    };
  });
}

/**
 * Get all assignments directly attached to a single course or session.
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

  return withMySubmission(assignments, requestingUser.id);
};

/**
 * Get every assignment across all courses in a track, PLUS every
 * assignment on any standalone session mounted directly on the track
 * (i.e. not part of a course). Each assignment includes `mySubmission`.
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

  return withMySubmission(assignments, requestingUser.id);
};
