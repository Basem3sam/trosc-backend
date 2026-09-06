const assignmentSubmissionService = require('../services/assignmentSubmission.service');
const catchAsync = require('../utils/catchAsync');

exports.submitAssignment = catchAsync(async (req, res, next) => {
  const { submission, late } = await assignmentSubmissionService.submitAssignment(
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

exports.gradeSubmission = catchAsync(async (req, res, next) => {
  const submission = await assignmentSubmissionService.gradeSubmission(
    req.params.id,
    req.params.studentId,
    req.body.grade,
  );

  res.status(200).json({
    status: 'success',
    data: { submission },
  });
});
