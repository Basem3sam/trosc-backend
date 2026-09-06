const Assignment = require('../models/assignment.model');
const Course = require('../models/course.model');
const Session = require('../models/session.model');
const AppError = require('../utils/AppError');

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
    throw new AppError(`The ${label} this assignment belongs to no longer exists`, 404);
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
  } else {
    assignment.submissions.push({ student: studentId, file: data.file });
  }

  await assignment.save();

  const submission = assignment.submissions.find(
    (s) => s.student.toString() === studentId,
  );

  return {
    submission,
    late: submission.submittedAt > assignment.deadline,
  };
};

/**
 * Grade a student's submission for an assignment. Ownership (instructor
 * === requester, or admin) is enforced by the checkOwnership middleware
 * before this runs.
 * @param {string} assignmentId
 * @param {string} studentId
 * @param {number} grade
 * @returns {Promise<Object>} the updated submission
 */
exports.gradeSubmission = async (assignmentId, studentId, grade) => {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new AppError('No assignment found with that ID', 404);
  }

  const submission = assignment.submissions.find(
    (s) => s.student.toString() === studentId,
  );
  if (!submission) {
    throw new AppError('This student has not submitted this assignment yet', 404);
  }

  submission.grade = grade;
  await assignment.save();

  return submission;
};
