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

/**
 * Factory: returns a controller that creates an assignment for the given
 * resource type ('course' | 'session'). The resource ID is always read
 * from req.params.id.
 */
exports.createAssignment = (resourceType) =>
  catchAsync(async (req, res, next) => {
    const assignment = await assignmentService.createAssignment(
      resourceType,
      req.params.id,
      req.user.id,
      req.body,
    );

    res.status(201).json({
      status: 'success',
      data: { assignment },
    });
  });

// #1.5: staff only (checkOwnership at the route level). Single assignment
// with its submissions attached.
exports.getAssignment = catchAsync(async (req, res, next) => {
  const assignment = await assignmentService.getAssignmentById(req.params.id);

  res.status(200).json({
    status: 'success',
    data: { assignment },
  });
});

exports.updateAssignment = catchAsync(async (req, res, next) => {
  const assignment = await assignmentService.updateAssignment(
    req.params.id,
    req.body,
    req.user.id,
  );

  res.status(200).json({
    status: 'success',
    data: { assignment },
  });
});

exports.deleteAssignment = catchAsync(async (req, res, next) => {
  await assignmentService.deleteAssignment(req.params.id, req.user.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
