const Assignment = require('../models/assignment.model');
const Course = require('../models/course.model');
const Session = require('../models/session.model');
const AppError = require('../utils/AppError');
const { logActivity } = require('./activityLog.service');

/**
 * Check whether a user is enrolled in the course or session an assignment
 * belongs to (exactly one of the two is ever set — see the model's
 * pre-validate hook).
 */
async function assertEnrolled(assignment, userId) {
  const resourceId = assignment.course || assignment.session;
  const Model = assignment.course ? Course : Session;
  const label = assignment.course ? 'course' : 'session';

  const resource = await Model.findById(resourceId).select('students');
  if (!resource) {
    // Shouldn't normally happen (the parent was required to create the
    // assignment), but guards against a deleted course/session.
    throw new AppError(
      `The ${label} this assignment belongs to no longer exists`,
      404,
    );
  }

  const isEnrolled = resource.students.some(
    (studentId) => studentId.toString() === userId,
  );
  if (!isEnrolled) {
    throw new AppError(
      `Only students enrolled in this assignment's ${label} can submit`,
      403,
    );
  }
}

/**
 * Submit (or resubmit) a student's work for an assignment. Resubmitting
 * overwrites the previous file and submission time, and clears any
 * existing grade — a new file means the old grade no longer applies.
 * @param {string} assignmentId
 * @param {string} studentId
 * @param {Object} data - { file }
 * @returns {Promise<{ submission: Object, late: boolean }>}
 */
exports.submitAssignment = async (assignmentId, studentId, data) => {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new AppError('No assignment found with that ID', 404);
  }

  await assertEnrolled(assignment, studentId);

  const existing = assignment.submissions.find(
    (s) => s.student.toString() === studentId,
  );

  if (existing) {
    existing.file = data.file;
    existing.submittedAt = new Date();
    existing.grade = undefined;
    existing.feedback = undefined;
  } else {
    assignment.submissions.push({ student: studentId, file: data.file });
  }

  await assignment.save();

  const submission = assignment.submissions.find(
    (s) => s.student.toString() === studentId,
  );

  await logActivity({
    userId: studentId,
    action: 'submitted_assignment',
    targetModel: 'Assignment',
    targetId: assignmentId,
  });

  return {
    submission,
    late: submission.submittedAt > assignment.deadline,
  };
};

/**
 * #1.3: resolves a student's submitted file URL for staff access.
 * checkOwnership (route-level) already restricts this to the assignment's
 * own instructor or an admin — students never reach this function, so the
 * raw URL returned here is safe to redirect to. This is also why
 * GET /assignments/:id (assignment.service.js#getAssignmentById) strips
 * `file` from the submissions it returns: the raw Drive/YouTube link is
 * only ever handed out through this one gated path, never in a list.
 * @param {string} assignmentId
 * @param {string} studentId
 * @returns {Promise<string>} the submission's file URL
 * @throws {AppError} 404 if the assignment or the student's submission doesn't exist
 */
exports.getSubmissionFile = async (assignmentId, studentId) => {
  const assignment =
    await Assignment.findById(assignmentId).select('submissions');
  if (!assignment) {
    throw new AppError('No assignment found with that ID', 404);
  }

  const submission = assignment.submissions.find(
    (s) => s.student.toString() === studentId,
  );
  if (!submission) {
    throw new AppError(
      'This student has not submitted this assignment yet',
      404,
    );
  }

  return submission.file;
};

/**
 * Grade a student's submission for an assignment. Ownership (instructor
 * === requester, or admin) is enforced by the checkOwnership middleware
 * before this runs.
 * @param {string} assignmentId
 * @param {string} studentId
 * @param {number} grade
 * @param {string} requestingUserId
 * @param {string} [feedback] - optional, up to 2000 characters (#2.4)
 * @returns {Promise<Object>} the updated submission
 */
exports.gradeSubmission = async (
  assignmentId,
  studentId,
  grade,
  requestingUserId,
  feedback,
) => {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new AppError('No assignment found with that ID', 404);
  }

  const submission = assignment.submissions.find(
    (s) => s.student.toString() === studentId,
  );
  if (!submission) {
    throw new AppError(
      'This student has not submitted this assignment yet',
      404,
    );
  }

  // M10: defensive only — instructors aren't enrolled as students so this
  // shouldn't be reachable in practice, but costs nothing to guard against
  // an instructor grading their own submission.
  if (assignment.instructor?.toString() === studentId) {
    throw new AppError('An instructor cannot grade their own submission', 400);
  }

  submission.grade = grade;
  if (feedback !== undefined) {
    submission.feedback = feedback;
  }
  await assignment.save();

  await logActivity({
    userId: requestingUserId,
    action: 'graded_assignment',
    targetModel: 'Assignment',
    targetId: assignmentId,
    metadata: { studentId, grade },
  });

  return submission;
};
