const WeeklyTask = require('../models/weeklyTask.model');
const Course = require('../models/course.model');
const Track = require('../models/track.model');
const AppError = require('../utils/AppError');

function assertCanView(resource, label, requestingUser) {
  if (requestingUser.role === 'student') {
    const isEnrolled = resource.students.some(
      (studentId) => studentId.toString() === requestingUser.id,
    );
    if (!isEnrolled) {
      throw new AppError(
        `Only enrolled students can view this ${label}'s weekly tasks`,
        403,
      );
    }
  }
  // admin and instructor roles pass through without an enrollment check,
  // matching how course/track creation is gated by role only elsewhere.
}

// Attach a `done` boolean to every item, computed from this user's own
// completions, and drop the raw `completions` array (don't leak every
// student's progress to every viewer).
function withDoneFlags(tasks, userId) {
  return tasks.map((task) => {
    const plain = task.toObject();
    const completedItemIds = new Set(
      plain.completions
        .filter((c) => c.student.toString() === userId)
        .map((c) => c.item.toString()),
    );

    return {
      ...plain,
      completions: undefined,
      items: plain.items.map((item) => ({
        ...item,
        done: completedItemIds.has(item._id.toString()),
      })),
    };
  });
}

/**
 * Create a new weekly task bucket for a course.
 * @param {string} courseId
 * @param {string} instructorId - req.user.id (the creator)
 * @param {Object} data - { week, title, items }
 * @returns {Promise<WeeklyTask>}
 */
exports.createWeeklyTask = async (courseId, instructorId, data) => {
  const course = await Course.findById(courseId).select('_id');
  if (!course) {
    throw new AppError('No course found with that ID', 404);
  }

  const existing = await WeeklyTask.findOne({
    course: courseId,
    week: data.week,
  });
  if (existing) {
    throw new AppError(
      `Week ${data.week} already has a weekly task for this course`,
      400,
    );
  }

  const task = await WeeklyTask.create({
    course: courseId,
    instructor: instructorId,
    week: data.week,
    title: data.title,
    items: data.items,
  });

  return task;
};

/**
 * Get all weekly tasks for a single course, sorted by week, with `done`
 * flags computed for the requesting user.
 * @param {string} courseId
 * @param {Object} requestingUser - req.user (id, role)
 * @returns {Promise<WeeklyTask[]>}
 */
exports.getCourseWeeklyTasks = async (courseId, requestingUser) => {
  const course = await Course.findById(courseId).select('students');
  if (!course) {
    throw new AppError('No course found with that ID', 404);
  }
  assertCanView(course, 'course', requestingUser);

  const tasks = await WeeklyTask.find({ course: courseId }).sort({ week: 1 });

  return withDoneFlags(tasks, requestingUser.id);
};

/**
 * Get all weekly tasks across every course in a track, sorted by
 * (week, course), with `done` flags computed for the requesting user.
 *
 * Note: only courses carry weekly tasks — standalone sessions mounted
 * directly on a track (not part of a course) don't have a syllabus/weekly
 * structure, so they're not included here (unlike reviews/assignments,
 * which do cover standalone sessions).
 *
 * @param {string} trackId
 * @param {Object} requestingUser - req.user (id, role)
 * @returns {Promise<WeeklyTask[]>}
 */
exports.getTrackWeeklyTasks = async (trackId, requestingUser) => {
  const track = await Track.findById(trackId).select('students courses');
  if (!track) {
    throw new AppError('No track found with that ID', 404);
  }
  assertCanView(track, 'track', requestingUser);

  const tasks = await WeeklyTask.find({ course: { $in: track.courses } })
    .sort({ week: 1 })
    .populate('course', 'title');

  return withDoneFlags(tasks, requestingUser.id);
};

/**
 * Update a weekly task's week number, title, and/or items. Ownership
 * (instructor === requester, or admin) is enforced by the checkOwnership
 * middleware before this runs.
 *
 * Items passed WITH their existing _id are edited in place, preserving
 * any students' completion records for that item. Items passed WITHOUT
 * an _id are treated as brand new (get a fresh _id, start with zero
 * completions). Any item that existed before but is missing from the new
 * `items` array is dropped, and its now-orphaned completion records are
 * cleaned up along with it.
 *
 * @param {string} taskId
 * @param {Object} data - { week?, title?, items? }
 * @returns {Promise<WeeklyTask>}
 */
exports.updateWeeklyTask = async (taskId, data) => {
  const task = await WeeklyTask.findById(taskId);
  if (!task) {
    throw new AppError('No weekly task found with that ID', 404);
  }

  if (data.week !== undefined && data.week !== task.week) {
    const clash = await WeeklyTask.findOne({
      course: task.course,
      week: data.week,
      _id: { $ne: taskId },
    });
    if (clash) {
      throw new AppError(
        `Week ${data.week} already has a weekly task for this course`,
        400,
      );
    }
    task.week = data.week;
  }

  if (data.title !== undefined) {
    task.title = data.title;
  }

  if (data.items !== undefined) {
    // Mongoose keeps a subdocument's _id if one is provided in the plain
    // object being assigned, and generates a fresh one otherwise.
    task.items = data.items;

    const survivingItemIds = new Set(
      task.items.map((item) => item._id.toString()),
    );
    task.completions = task.completions.filter((c) =>
      survivingItemIds.has(c.item.toString()),
    );
  }

  await task.save();
  return task;
};

/**
 * Delete a weekly task (and all of its completion records with it).
 * Ownership (instructor === requester, or admin) is enforced by the
 * checkOwnership middleware before this runs.
 * @param {string} taskId
 */
exports.deleteWeeklyTask = async (taskId) => {
  const task = await WeeklyTask.findByIdAndDelete(taskId);
  if (!task) {
    throw new AppError('No weekly task found with that ID', 404);
  }
};

/**
 * Mark (or unmark) a single item within a weekly task as completed by the
 * requesting student. Idempotent in both directions.
 * @param {string} taskId
 * @param {string} itemId
 * @param {Object} requestingUser - req.user (id, role)
 * @param {boolean} complete - true to mark done, false to unmark
 */
exports.setItemCompletion = async (
  taskId,
  itemId,
  requestingUser,
  complete,
) => {
  const task = await WeeklyTask.findById(taskId).populate({
    path: 'course',
    select: 'students',
  });
  if (!task) {
    throw new AppError('No weekly task found with that ID', 404);
  }

  const itemExists = task.items.some((item) => item._id.toString() === itemId);
  if (!itemExists) {
    throw new AppError('No item found with that ID on this weekly task', 404);
  }

  if (requestingUser.role === 'student') {
    const isEnrolled = task.course.students.some(
      (studentId) => studentId.toString() === requestingUser.id,
    );
    if (!isEnrolled) {
      throw new AppError(
        'Only enrolled students can track progress on this weekly task',
        403,
      );
    }
  }

  if (complete) {
    await WeeklyTask.updateOne(
      { _id: taskId },
      {
        $pull: { completions: { student: requestingUser.id, item: itemId } },
      },
    );
    await WeeklyTask.updateOne(
      { _id: taskId },
      {
        $push: {
          completions: { student: requestingUser.id, item: itemId },
        },
      },
    );
  } else {
    await WeeklyTask.updateOne(
      { _id: taskId },
      {
        $pull: { completions: { student: requestingUser.id, item: itemId } },
      },
    );
  }
};
