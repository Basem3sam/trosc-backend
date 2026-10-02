const User = require('../models/user.model');
const Track = require('../models/track.model');
const Course = require('../models/course.model');
const Session = require('../models/session.model');
const Assignment = require('../models/assignment.model');
const Review = require('../models/review.model');
const WeeklyTask = require('../models/weeklytask.model');
const Event = require('../models/event.model');
const Announcement = require('../models/announcement.model');
const APIFeatures = require('../utils/APIFeatures');
const AppError = require('../utils/AppError');
const cascade = require('./cascade.service');
const policy = require('./policy.service');
const trackService = require('./track.service');
const { logActivity } = require('./activityLog.service');

// ===================================================================
// 🎯 COURSE CRUD OPERATIONS
// ===================================================================

/**
 * Rule 4 guard for the `track` field on POST/PATCH /courses (the dedicated
 * PATCH/DELETE /tracks/:trackId/courses/:courseId endpoints use the
 * requireTrackLink middleware, which applies the same rule):
 *   link   - an admin, OR the course's own instructor who is ALSO the lead
 *            / a co-instructor of the TARGET track;
 *   unlink - an admin, OR staff of that track, OR the course's own
 *            instructor.
 * @param {string} courseInstructorId - the course's current instructor id
 * @param {'link'|'unlink'} mode
 * @throws {AppError} 404 if the track doesn't exist, 403 if not permitted
 */
async function assertTrackLinkRight(
  trackId,
  courseInstructorId,
  requestingUser,
  mode,
) {
  if (policy.isAdmin(requestingUser)) return;

  const track = await policy.loadStaffTrack({}, trackId);
  if (!track) {
    throw new AppError('No track found with that ID', 404);
  }
  const item = { instructor: courseInstructorId };
  const allowed =
    mode === 'link'
      ? policy.canLinkToTrack(requestingUser, item, track)
      : policy.canUnlinkFromTrack(requestingUser, item, track);
  if (!allowed) {
    throw new AppError(
      mode === 'link'
        ? 'You can only link your own course to a track you lead or co-instruct'
        : 'You can only unlink a course you own or from a track you manage',
      403,
    );
  }
}

/**
 * Round-2 #2.1: confirms `instructorId` is an existing user whose role is
 * 'instructor' or 'admin'. Only reached when an admin set `instructor`.
 * @throws {AppError} 400 if the user doesn't exist or has the wrong role
 */
async function assertValidInstructor(instructorId) {
  const user = await User.findById(instructorId).select('role');
  if (!user) {
    throw new AppError('No user found with that instructor ID', 400);
  }
  if (!['instructor', 'admin'].includes(user.role)) {
    throw new AppError(
      'Instructor must be a user with role "instructor" or "admin"',
      400,
    );
  }
}

/**
 * Create a new course
 * @param {Object} courseBody - Course data
 * @returns {Promise<Course>} Newly created course
 * @throws {AppError} 400 if validation fails, 409 if title exists
 */
exports.createCourse = async (courseBody, requestingUser = null) => {
  // #3.3: don't let `track` reach Course.create() directly — that would
  // set course.track without ever touching Track.courses, which is
  // exactly how the two sides desynced before this fix. Create the
  // course without it, then let addCourseToTrack own both sides of the
  // relationship (it also validates the track exists and enrolls the
  // track's existing students into the new course).
  const { track: trackId, ...courseData } = courseBody;

  // #2.1: an admin may create the course on an instructor's behalf.
  if (courseData.instructor && courseData.instructor !== requestingUser?.id) {
    await assertValidInstructor(courseData.instructor);
  }

  const course = await Course.create(courseData);

  if (trackId) {
    try {
      await assertTrackLinkRight(
        trackId,
        courseData.instructor,
        requestingUser,
        'link',
      );
      await trackService.addCourseToTrack(trackId, course._id);
    } catch (err) {
      // Don't leave an orphan course behind if the requested track
      // turned out to be invalid/not owned by this requester — the
      // create as a whole should fail, not silently succeed without
      // the track.
      await Course.findByIdAndDelete(course._id);
      throw err;
    }
  }

  await logActivity({
    userId: requestingUser?.id,
    action: 'created_course',
    targetModel: 'Course',
    targetId: course._id,
  });

  // Re-fetch: addCourseToTrack saved `track` on its own Course instance,
  // not this one.
  return trackId ? Course.findById(course._id) : course;
};

/**
 * Get all courses with advanced filtering, sorting, and pagination
 * @param {Object} query - Express query object
 * @returns {Promise<{courses: Array, total: Number}>} Paginated courses
 */
exports.getAllCourses = async (query, requestingUser = null) => {
  // Q5/Q2: same fix as track.service.js#getAllTracks — previously
  // returned every course regardless of `published` to any caller.
  // Stage 4: an instructor also sees the drafts they can manage (their own
  // courses and every course in a track they lead or co-instruct).
  const scope = await policy.loadStaffScope({}, requestingUser);
  const features = new APIFeatures(Course.find(), query, Course)
    .filter(
      policy.andFilters(
        policy.manageableListFilter(requestingUser, scope, 'course'),
      ),
    )
    .search(['title', 'description'])
    .sort()
    .limitFields();

  await features.paginate();

  const courses = await features.query;

  // Q7: previously returned every course's raw `students` ID array to
  // literally any caller, including anonymous — replaced with
  // `studentCount` (already a schema virtual) plus `isEnrolled` for the
  // requester. Each course's own instructor (or an admin) still gets the
  // full array.
  const sanitized = courses.map((c) => {
    const obj = c.toObject();
    const isStaff = policy.isCourseStaffByScope(obj, requestingUser, scope);
    return policy.redactMembership(obj, requestingUser, isStaff, {
      isEnrolled: 'students',
    });
  });

  return {
    courses: sanitized || [],
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};

/**
 * Get a single course by ID
 * @param {string} courseId - MongoDB course ID
 * @param {boolean} populateSessions - Whether to populate sessions
 * @returns {Promise<Course>} Course document
 * @throws {AppError} 404 if course not found
 */
exports.getCourseById = async (courseId, populateSessions = false) => {
  let query = Course.findById(courseId);

  if (populateSessions) {
    query = query.populate({
      path: 'sessions',
      select: 'title description duration level published startDate',
      match: { published: true },
    });
  }

  const course = await query;
  if (!course) {
    throw new AppError('No course found with that ID', 404);
  }
  return course;
};

/**
 * Get detailed course with full population
 * @param {string} courseId - MongoDB course ID
 * @returns {Promise<Course>} Fully populated course
 * @throws {AppError} 404 if course not found
 */
exports.getCourseDetails = async (courseId, requestingUser = null) => {
  const course = await Course.findById(courseId)
    .populate({
      path: 'sessions',
      select: 'title description duration level published startDate',
      match: { published: true },
    })
    .populate({ path: 'prerequisites', select: 'title description level' });

  if (!course) throw new AppError('No course found with that ID', 404);

  // "Owner" now means: currently an instructor AND the course's
  // instructor or a lead/co-instructor of its track (stage 4).
  const isAdmin = policy.isAdmin(requestingUser);
  const isOwner =
    policy.isInstructorRole(requestingUser) &&
    (policy.isOwnerOf(course, requestingUser, 'instructor') ||
      (await policy.canManage({}, requestingUser, 'course', courseId)));
  const isEnrolled = policy.isMemberOf(course.students, requestingUser);

  if (!course.published && !isOwner && !isAdmin) {
    throw new AppError('No course found with that ID', 404);
  }
  if (isOwner || isAdmin || isEnrolled) {
    await course.populate({ path: 'students', select: 'name email photo' });
  }

  // Q7: when none of the above populated `students`, it was still the
  // raw ID array underneath — never actually hidden. Replaced with
  // `studentCount` (schema virtual, already present) + `isEnrolled: false`.
  const courseObj = course.toObject();
  courseObj.isEnrolled = isEnrolled;
  if (!(isOwner || isAdmin || isEnrolled)) {
    delete courseObj.students;
  }

  return courseObj;
};

/**
 * Update course information
 * @param {string} courseId - MongoDB course ID
 * @param {Object} updateBody - Fields to update
 * @returns {Promise<Course>} Updated course document
 * @throws {AppError} 404 if course not found
 */
exports.updateCourse = async (courseId, updateBody, requestingUser = null) => {
  // #2.1: admin-only reassignment (the controller already dropped
  // `instructor` for everyone else). Validated before any write so a bad
  // id changes nothing; takes effect on the very next request.
  if (updateBody.instructor) {
    await assertValidInstructor(updateBody.instructor);
  }

  // Self-reference can only happen on update (a client can't know a
  // course's own ID before it's created to list it as its own
  // prerequisite at creation time). Once set, the course's own
  // prerequisites-met check can never pass, permanently blocking
  // self-enrollment.
  if (
    updateBody.prerequisites?.some(
      (id) => id.toString() === courseId.toString(),
    )
  ) {
    throw new AppError(
      'A course cannot be listed as its own prerequisite',
      400,
    );
  }

  // #3.3: `track` is handled separately from the rest of the update —
  // writing it via Course.findByIdAndUpdate() directly (the old
  // behavior) never touched Track.courses on either the old or new
  // track, which is exactly how course/track desyncs like the one
  // described in #3.3 happened. Route it through the same
  // addCourseToTrack/removeCourseFromTrack functions the track-side
  // endpoints already use, so both sides always agree.
  const hasTrackChange = Object.prototype.hasOwnProperty.call(
    updateBody,
    'track',
  );
  const { track: newTrackId, ...restOfUpdate } = updateBody;

  if (hasTrackChange) {
    const current = await Course.findById(courseId).select('track instructor');
    if (!current) {
      throw new AppError('No course found with that ID', 404);
    }
    const currentTrackId = current.track
      ? (current.track._id || current.track).toString()
      : null;
    const courseInstructorId = (
      current.instructor?._id || current.instructor
    )?.toString();

    if (currentTrackId !== (newTrackId || null)) {
      // Detach from the old track first (if any) — enforces the same
      // "track must keep at least one course or session" guard
      // DELETE /tracks/:id/courses/:courseId already has, and the same
      // track-ownership gate that endpoint enforces too.
      if (currentTrackId) {
        await assertTrackLinkRight(
          currentTrackId,
          courseInstructorId,
          requestingUser,
          'unlink',
        );
        await trackService.removeCourseFromTrack(currentTrackId, courseId);
      }
      // Then attach to the new one (if any) — validates it exists,
      // confirms the requester owns it (or is admin), and enrolls its
      // current students into this course.
      if (newTrackId) {
        await assertTrackLinkRight(
          newTrackId,
          courseInstructorId,
          requestingUser,
          'link',
        );
        await trackService.addCourseToTrack(newTrackId, courseId);
      }
    }
  }

  const course = await Course.findByIdAndUpdate(courseId, restOfUpdate, {
    new: true,
    runValidators: true,
  });

  if (!course) {
    throw new AppError('No course found with that ID', 404);
  }

  await course.populate([
    { path: 'instructor', select: 'name email role photo' },
    { path: 'track', select: 'title description' },
  ]);

  await logActivity({
    userId: requestingUser?.id,
    action: 'updated_course',
    targetModel: 'Course',
    targetId: courseId,
  });

  return course;
};

/**
 * Permanently delete a course and handle related sessions
 * @param {string} courseId - MongoDB course ID
 * @throws {AppError} 404 if course not found
 */
exports.deleteCourse = async (courseId, requestingUserId) => {
  const course = await Course.findById(courseId);
  if (!course) throw new AppError('No course found with that ID', 404);

  // Mirror track.service.js#removeCourseFromTrack: a track must keep at
  // least one course or session. Deleting this course entirely (not just
  // detaching it) can empty the parent track the same way removing it
  // could, so apply the same guard before the delete goes through.
  if (course.track) {
    const parentTrack = await Track.findById(course.track);
    if (parentTrack) {
      const remainingCourses = parentTrack.courses.filter(
        (id) => id.toString() !== courseId.toString(),
      );
      if (remainingCourses.length === 0 && parentTrack.sessions.length === 0) {
        throw new AppError(
          'Cannot delete last course: track must have at least one course or session',
          400,
        );
      }
    }
  }

  await Course.findByIdAndDelete(courseId);

  await Promise.all([
    Assignment.deleteMany({ course: courseId }),
    Review.deleteMany({ course: courseId }),
    WeeklyTask.deleteMany({ course: courseId }), // also deletes embedded completions
  ]);

  // Remove from parent track
  await Track.updateMany(
    { courses: courseId },
    { $pull: { courses: courseId } },
  );

  // T4: other courses may still list this course as a prerequisite —
  // pull the dangling reference so prerequisite checks don't reference
  // a course that no longer exists.
  await Course.updateMany(
    { prerequisites: courseId },
    { $pull: { prerequisites: courseId } },
  );

  // T5: Event.course and Announcement.targetCourse are optional refs —
  // not required, so this doesn't block the delete, but leaving them
  // dangling produces populated-null responses downstream.
  await Event.updateMany({ course: courseId }, { $set: { course: null } });
  await Announcement.updateMany(
    { targetCourse: courseId },
    { $set: { targetCourse: null } },
  );

  // Orphan sessions — they become standalone or keep their track

  const sessionsInCourse = await Session.find({
    _id: { $in: course.sessions },
  });
  await Promise.all(
    sessionsInCourse.map(async (session) => {
      session.course = null;
      session.isStandalone = !session.tracks?.length && !session.course; // true only if no track
      await session.save();
    }),
  );

  if (course.students?.length) {
    await User.updateMany(
      { _id: { $in: course.students } },
      { $pull: { enrolledCourses: courseId } },
    );
  }

  await logActivity({
    userId: requestingUserId,
    action: 'deleted_course',
    targetModel: 'Course',
    targetId: courseId,
  });

  return null;
};

// ===================================================================
// 🔗 SESSION-COURSE RELATIONSHIP MANAGEMENT
// ===================================================================

/**
 * Add a session to a course
 * @param {string} courseId - MongoDB course ID
 * @param {string} sessionId - MongoDB session ID
 * @returns {Promise<Course>} Updated course
 * @throws {AppError} 404/400 if invalid
 */
exports.addSessionToCourse = async (courseId, sessionId) => {
  const courseExists = await Course.findById(courseId);
  if (!courseExists) {
    throw new AppError('No course found with that ID', 404);
  }

  const session = await Session.findById(sessionId);
  if (!session) {
    throw new AppError('No session found with that ID', 404);
  }

  if (courseExists.sessions.some((id) => id.toString() === sessionId)) {
    throw new AppError('Session already exists in this course', 400);
  }

  if (session.course && session.course.toString() !== courseId) {
    await Course.findByIdAndUpdate(session.course, {
      $pull: { sessions: sessionId },
    });
  }

  const course = await Course.findByIdAndUpdate(
    courseId,
    { $addToSet: { sessions: sessionId } },
    { new: true, runValidators: true },
  );

  await Session.findByIdAndUpdate(sessionId, {
    course: courseId,
    isStandalone: false,
  });

  return course;
};

/**
 * Remove a session from a course
 * @param {string} courseId - MongoDB course ID
 * @param {string} sessionId - MongoDB session ID
 * @returns {Promise<Course>} Updated course
 * @throws {AppError} 404/400 if invalid
 */
exports.removeSessionFromCourse = async (courseId, sessionId) => {
  const courseExists = await Course.findById(courseId);
  if (!courseExists) {
    throw new AppError('No course found with that ID', 404);
  }

  const session = await Session.findById(sessionId);
  if (!session) {
    throw new AppError('No session found with that ID', 404);
  }

  if (!courseExists.sessions.some((id) => id.toString() === sessionId)) {
    throw new AppError('Session is not in this course', 400);
  }

  const course = await Course.findByIdAndUpdate(
    courseId,
    { $pull: { sessions: sessionId } },
    { new: true, runValidators: true },
  );

  if (session) {
    session.course = null;
    session.isStandalone = !session.tracks?.length && !session.course; // true if also not in any track
    await session.save();
  }

  return course;
};

// ===================================================================
// 👥 STUDENT ENROLLMENT MANAGEMENT
// ===================================================================

/**
 * Enroll a student in a course
 * @param {string} courseId - MongoDB course ID
 * @param {string} studentId - MongoDB user ID
 * @returns {Promise<Course>} Updated course
 * @throws {AppError} 404/400 if invalid
 */
exports.enrollStudentInCourse = async (courseId, studentId) => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new AppError('No course found with that ID', 404);
  }

  // Fast-path check, same caveat as enrollment.service.js: the query
  // guard on the update below is what actually closes the race.
  if (course.students.some((id) => id.toString() === studentId)) {
    throw new AppError('Student is already enrolled in this course', 400);
  }

  // Was already using $addToSet, but findByIdAndUpdate with no
  // `students` condition would silently no-op on a race and still
  // return 200 — matching only when studentId isn't already present
  // makes a racing duplicate surface the same 400 a sequential one gets.
  const updatedCourse = await Course.findOneAndUpdate(
    { _id: courseId, students: { $ne: studentId } },
    { $addToSet: { students: studentId } },
    { new: true, runValidators: true },
  );

  if (!updatedCourse) {
    throw new AppError('Student is already enrolled in this course', 400);
  }

  await cascade.syncCourseEnrollment(studentId, courseId);

  return updatedCourse;
};

/**
 * Remove a student from a course
 * @param {string} courseId - MongoDB course ID
 * @param {string} studentId - MongoDB user ID
 * @returns {Promise<Course>} Updated course
 * @throws {AppError} 404/400 if invalid
 */
exports.removeStudentFromCourse = async (courseId, studentId) => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new AppError('No course found with that ID', 404);
  }

  if (!course.students.some((id) => id.toString() === studentId)) {
    throw new AppError('Student is not enrolled in this course', 400);
  }

  const updatedCourse = await Course.findByIdAndUpdate(
    courseId,
    { $pull: { students: studentId } },
    { new: true, runValidators: true },
  );

  await cascade.unsyncCourseEnrollment(studentId, courseId);

  return updatedCourse;
};

// ===================================================================
// 🔍 ADVANCED QUERIES
// ===================================================================

// Package 2: shared Q7 redaction for the course sub-lists below (by
// instructor / track / student). "Staff" = can manage the course under the
// stage-4 policy, computed from the caller's loaded staff scope.
function redactCourseList(courses, requestingUser, scope) {
  return courses.map((c) => {
    const obj = c.toObject();
    const isStaff = policy.isCourseStaffByScope(obj, requestingUser, scope);
    return policy.redactMembership(obj, requestingUser, isStaff, {
      isEnrolled: 'students',
    });
  });
}

// Package 2: the Q5 draft rule + `extra` conditions, shared by the three
// sub-lists. Published only for the public; staff also get the drafts they
// manage; admins get everything.
function subListFilter(requestingUser, scope, extra) {
  return policy.andFilters(
    policy.manageableListFilter(requestingUser, scope, 'course'),
    extra,
  );
}

/**
 * Get all courses by instructor
 * @param {string} instructorId - MongoDB user ID
 * @param {Object} query - Filtering options
 * @param {Object|null} requestingUser - caller (null = anonymous)
 * @returns {Promise<{courses: Array, total: Number}>}
 */
exports.getCoursesByInstructor = async (
  instructorId,
  query,
  requestingUser = null,
) => {
  const scope = await policy.loadStaffScope({}, requestingUser);
  const features = new APIFeatures(Course.find(), query, Course)
    .filter(subListFilter(requestingUser, scope, { instructor: instructorId }))
    .search(['title', 'description'])
    .sort()
    .limitFields();

  await features.paginate();

  const courses = await features.query;

  return {
    courses: redactCourseList(courses, requestingUser, scope),
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};

/**
 * Get all courses by track
 * @param {string} trackId - MongoDB track ID
 * @param {Object} query - Filtering options
 * @param {Object|null} requestingUser - caller (null = anonymous)
 * @returns {Promise<{courses: Array, total: Number}>}
 */
exports.getCoursesByTrack = async (trackId, query, requestingUser = null) => {
  const scope = await policy.loadStaffScope({}, requestingUser);
  const features = new APIFeatures(Course.find(), query, Course)
    .filter(subListFilter(requestingUser, scope, { track: trackId }))
    .search(['title', 'description'])
    .sort()
    .limitFields();

  await features.paginate();

  const courses = await features.query;

  return {
    courses: redactCourseList(courses, requestingUser, scope),
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};

/**
 * Get all courses a student is enrolled in
 * @param {string} studentId - MongoDB user ID
 * @param {Object} query - Filtering options
 * @returns {Promise<{courses: Array, total: Number}>}
 */
exports.getCoursesByStudent = async (
  studentId,
  query,
  requestingUser = null,
) => {
  // Rule for a student's own enrolled content that was later unpublished:
  // it is hidden from this list (like every other list and the detail
  // endpoint) - unless the caller manages it or is an admin.
  const scope = await policy.loadStaffScope({}, requestingUser);
  const features = new APIFeatures(Course.find(), query, Course)
    .filter(subListFilter(requestingUser, scope, { students: studentId }))
    .sort()
    .limitFields();

  await features.paginate();

  const courses = await features.query;

  return {
    courses: redactCourseList(courses, requestingUser, scope),
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};
