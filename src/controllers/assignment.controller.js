const assignmentService = require('../services/assignment.service');
const catchAsync = require('../utils/catchAsync');

exports.getTrackAssignments = catchAsync(async (req, res, next) => {
  const assignments = await assignmentService.getTrackAssignments(
    req.params.id,
    req.user,
  );

  res.status(200).json({
    status: 'success',
    results: assignments.length,
    data: { assignments },
  });
});

/**
 * Factory: returns a controller that lists assignments for the given
 * resource type ('course' | 'session'). The resource ID is always read
 * from req.params.id.
 */
exports.getResourceAssignments = (resourceType) =>
  catchAsync(async (req, res, next) => {
    const assignments = await assignmentService.getResourceAssignments(
      resourceType,
      req.params.id,
      req.user,
    );

    res.status(200).json({
      status: 'success',
      results: assignments.length,
      data: { assignments },
    });
  });
