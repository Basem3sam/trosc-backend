const assignmentSubmissionService = require('../services/assignmentSubmission.service');
const catchAsync = require('../utils/catchAsync');

exports.submitAssignment = catchAsync(async (req, res, next) => {
  const { submission, late } =
    await assignmentSubmissionService.submitAssignment(
      req.params.id,
      req.user.id,
      req.body,
    );

  res.status(200).json({
    status: 'success',
    late,
    data: { submission },
  });
});

// #1.3: staff-only. Redirects to the submission's stored file URL rather
// than returning it as JSON, so the raw Drive/YouTube link never sits in
// a response body a student could see over their shoulder or via a
// shared screen — only this one gated path ever exposes it.
exports.getSubmissionFile = catchAsync(async (req, res, next) => {
  const fileUrl = await assignmentSubmissionService.getSubmissionFile(
    req.params.id,
    req.params.studentId,
  );

  res.redirect(302, fileUrl);
});

exports.gradeSubmission = catchAsync(async (req, res, next) => {
  const submission = await assignmentSubmissionService.gradeSubmission(
    req.params.id,
    req.params.studentId,
    req.body.grade,
    req.user.id,
    req.body.feedback,
  );

  res.status(200).json({
    status: 'success',
    data: { submission },
  });
});
