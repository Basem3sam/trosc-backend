const weeklyTaskService = require('../services/weeklyTask.service');
const catchAsync = require('../utils/catchAsync');

exports.createWeeklyTask = catchAsync(async (req, res, next) => {
  const task = await weeklyTaskService.createWeeklyTask(
    req.params.id,
    req.user.id,
    req.body,
  );

  res.status(201).json({
    status: 'success',
    data: { task },
  });
});

exports.getCourseWeeklyTasks = catchAsync(async (req, res, next) => {
  const tasks = await weeklyTaskService.getCourseWeeklyTasks(
    req.params.id,
    req.user,
  );

  res.status(200).json({
    status: 'success',
    results: tasks.length,
    data: { tasks },
  });
});

exports.getTrackWeeklyTasks = catchAsync(async (req, res, next) => {
  const tasks = await weeklyTaskService.getTrackWeeklyTasks(
    req.params.id,
    req.user,
  );

  res.status(200).json({
    status: 'success',
    results: tasks.length,
    data: { tasks },
  });
});

exports.deleteWeeklyTask = catchAsync(async (req, res, next) => {
  await weeklyTaskService.deleteWeeklyTask(req.params.taskId);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.completeItem = catchAsync(async (req, res, next) => {
  await weeklyTaskService.setItemCompletion(
    req.params.taskId,
    req.params.itemId,
    req.user,
    true,
  );

  res.status(200).json({
    status: 'success',
    message: 'Item marked as completed',
  });
});

exports.uncompleteItem = catchAsync(async (req, res, next) => {
  await weeklyTaskService.setItemCompletion(
    req.params.taskId,
    req.params.itemId,
    req.user,
    false,
  );

  res.status(200).json({
    status: 'success',
    message: 'Item marked as incomplete',
  });
});

exports.updateWeeklyTask = catchAsync(async (req, res, next) => {
  const task = await weeklyTaskService.updateWeeklyTask(
    req.params.taskId,
    req.body,
  );
  res.status(200).json({ status: 'success', data: { task } });
});
