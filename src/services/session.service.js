const User = require('../models/user.model');
const Track = require('../models/track.model');
const Course = require('../models/course.model');
const Session = require('../models/session.model');
const Assignment = require('../models/assignment.model');
const Review = require('../models/review.model');
const APIFeatures = require('../utils/APIFeatures');
const AppError = require('../utils/AppError');
const cascade = require('./cascade.service');
const policy = require('./policy.service');
const { logActivity } = require('./activityLog.service');

// #1.1/#1.2/Q2: the ONE place every session LIST endpoint (getAllSessions,
// getSessionsByInstructor, getSessionsByTrack, getSessionsByStudent) runs
// its results through before responding, so the url/embedUrl/resources
// gate and the "never expose the raw progress array" rule can't drift
// between endpoints the way they had — getSessionsByTrack in particular
// previously applied neither, which is exactly how a draft session's
// url reached a student via that endpoint.
//
// `scope` is `await policy.loadStaffScope(req, user)`.
//
// NOTE: this only redacts fields per-document; it does NOT decide which
// documents are in the list at all. Callers are responsible for applying
// `policy.publishedListFilter()` to their query so draft sessions the
// caller isn't authorized for never reach this function in the first
// place (Q5's "draft listing behavior" contract).
function sanitizeSessionList(sessions, requestingUser, scope) {
  const userId = requestingUser?.id;
  const isAdmin = policy.isAdmin(requestingUser);

  return sessions.map((s) => {
    const obj = typeof s.toObject === 'function' ? s.toObject() : { ...s };

    // Stage 4: "owner" = anyone who currently manages the session (its own
    // instructor, its course's instructor, or lead/co-instructor of a
    // track it belongs to), computed from the caller's loaded scope.
    const isOwner = policy.isSessionStaffByScope(obj, requestingUser, scope);
    const isDirectStudent =
      !!userId &&
      obj.students?.some(
        (student) => (student._id ?? student)?.toString() === userId,
      );

    if (!isAdmin && !isOwner && !isDirectStudent) {
      delete obj.url;
      delete obj.embedUrl;
      delete obj.resources;
    }
    // Q7: studentCount is already on `obj` (schema virtual, computed off
    // the live document before `students` is deleted below); isEnrolled
    // reuses the direct-enrollment check above so list views get the
    // same studentCount/isEnrolled shape the detail endpoints do.
    obj.isEnrolled = !!isDirectStudent;
    delete obj.students; // was only populated for the gating check above
    delete obj.progress; // internal — never expose the full watched-list here
    return obj;
  });
}

// Stage 4 / rule 3: an admin may set `instructor` to someone else - that
// user must exist and be an instructor or admin (400 otherwise).
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

exports.createSession = async (sessionData, requestingUserId) => {
  if (sessionData.instructor && sessionData.instructor !== requestingUserId) {
    await assertValidInstructor(sessionData.instructor);
  }
  const session = await Session.create(sessionData);
  await logActivity({
    userId: requestingUserId,
    action: 'created_session',
    targetModel: 'Session',
    targetId: session._id,
  });
  return Session.findById(session._id).populate(
    'instructor',
    'name email role',
  );
};

exports.getAllSessions = async (query, requestingUser = null) => {
  // #1.1/Q5: draft sessions the caller isn't authorized for are excluded
  // from the list entirely (not just content-redacted) — admins see
  // everything, everyone else sees published sessions plus any drafts
  // they themselves own. Passed as APIFeatures' defaultFilter (merged
  // into `conditions`, which also drives the pagination count) rather
  // than pre-filtering Session.find() directly, so `total`/`totalPages`
  // stay accurate for whichever documents the caller can actually see.
  // Stage 4: instructors also see the drafts they currently manage.
  const scope = await policy.loadStaffScope({}, requestingUser);
  const features = new APIFeatures(Session.find(), query, Session)
    .filter(
      policy.andFilters(
        policy.manageableListFilter(requestingUser, scope, 'session'),
      ),
    )
    .search(['title', 'description'])
    .sort()
    .limitFields();

  await features.paginate();

  const sessions = await features.query
    .populate('instructor', 'name email role')
    .populate('students', 'role');

  // M16/#1.1/#1.2: field-level redaction (url/embedUrl/resources/progress)
  // for whichever documents made it past the visibility filter above.
  const sanitized = sanitizeSessionList(sessions, requestingUser, scope);

  return {
    sessions: sanitized || [],
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};

exports.getSessionById = async (sessionId, requestingUser = null) => {
  const session = await Session.findById(sessionId)
    .populate('instructor', 'name email role')
    .populate('students', 'name email role')
    .populate('tracks', 'title description students');

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  const sessionObj = session.toObject();

  // Add embed URL for frontend convenience
  if (sessionObj.url) {
    const youtubeMatch = sessionObj.url.match(
      /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    );
    if (youtubeMatch) {
      sessionObj.embedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }

    const driveMatch = sessionObj.url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      sessionObj.embedUrl = `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }
  }

  const userId = requestingUser?.id;
  const isAdmin = policy.isAdmin(requestingUser);
  // Stage 4: "owner" = currently manages the session (its instructor, its
  // course's instructor, or lead/co-instructor of a track it belongs to).
  const isOwner =
    policy.isInstructorRole(requestingUser) &&
    (await policy.canManage({}, requestingUser, 'session', sessionId));

  // #1.1/Q2: same "draft is invisible, not just content-redacted" rule
  // track.service.js#getTrackDetails and course.service.js#getCourseDetails
  // already enforce for their own detail endpoints — this endpoint was
  // missing it, which is exactly how an unpublished `[TEST]` session (and
  // its `url`) reached a student directly. Reuses the "session not found"
  // message so a draft's existence isn't distinguishable from it truly
  // not existing.
  if (!sessionObj.published && !isOwner && !isAdmin) {
    throw new AppError('Session not found', 404);
  }

  // Enrollment status is computed whenever there's a requester, regardless
  // of admin/owner status — it's used both for the content gate below and
  // for `myProgress`, which reflects *this user's own* watched status and
  // should show up whenever they're actually enrolled, even if they're
  // also the instructor or an admin previewing their own progress.
  let isDirectStudent = false;
  let isTrackStudent = false;
  let isCourseStudent = false;

  if (userId) {
    isDirectStudent = sessionObj.students?.some(
      (s) => s._id?.toString() === userId || s.toString() === userId,
    );

    isTrackStudent = sessionObj.tracks?.some((t) =>
      t.students?.some((s) => s.toString() === userId),
    );

    if (!isDirectStudent && !isTrackStudent && sessionObj.course) {
      const course = await Course.findById(sessionObj.course).select(
        'students',
      );
      isCourseStudent = !!course?.students.some((s) => s.toString() === userId);
    }
  }

  const isEnrolled = isDirectStudent || isTrackStudent || isCourseStudent;

  // GATE: strip url/embedUrl/resources unless the requester is the
  // session's own instructor, an admin, or enrolled — directly, via a
  // parent track, or via a parent course.
  const canSeeContent = isAdmin || isOwner || isEnrolled;

  sessionObj.isEnrolled = isEnrolled;

  if (!canSeeContent) {
    delete sessionObj.url;
    delete sessionObj.embedUrl;
    delete sessionObj.resources;
    // M3/Q7: students were populated with name/email/role above
    // regardless of viewer — course.service.js#getCourseDetails and
    // track.service.js#getTrackDetails only populate that for
    // owner/admin/enrolled. Previously this collapsed to bare IDs for
    // everyone else, which was still an unnecessary internal-array
    // exposure (Q7) even without the names attached — replaced with
    // `studentCount` (schema virtual, already present on sessionObj)
    // + the `isEnrolled` flag set above.
    delete sessionObj.students;
  }

  // #1.1: myProgress reflects the requesting user's own watched status.
  // Only present for enrolled users — an instructor/admin previewing a
  // session they're not enrolled in has no "progress" of their own to
  // report.
  if (isEnrolled) {
    const myEntry = (sessionObj.progress || []).find(
      (p) => p.student?.toString() === userId,
    );
    sessionObj.myProgress = myEntry
      ? { status: myEntry.status, watchedAt: myEntry.watchedAt }
      : { status: 'not_started', watchedAt: null };
  }
  delete sessionObj.progress; // internal — never expose the full list here

  return sessionObj;
};

exports.updateSession = async (sessionId, updateData, requestingUserId) => {
  if (updateData.instructor) {
    await assertValidInstructor(updateData.instructor);
  }
  const session = await Session.findByIdAndUpdate(sessionId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  await session.populate([
    { path: 'instructor', select: 'name email role' },
    { path: 'students', select: 'name email role' },
    { path: 'tracks', select: 'title description' },
  ]);

  await logActivity({
    userId: requestingUserId,
    action: 'updated_session',
    targetModel: 'Session',
    targetId: sessionId,
  });

  return session;
};

exports.deleteSession = async (sessionId, requestingUserId) => {
  const session = await Session.findByIdAndDelete(sessionId);

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  // T3: mirror Course delete — clean up Assignments and Reviews scoped
  // to this session, not just the parent Course/Track pointers.
  await Promise.all([
    Assignment.deleteMany({ session: sessionId }),
    Review.deleteMany({ session: sessionId }),
  ]);

  // Remove from every Course and Track that still lists it
  await Course.updateMany(
    { sessions: sessionId },
    { $pull: { sessions: sessionId } },
  );
  await Track.updateMany(
    { sessions: sessionId },
    { $pull: { sessions: sessionId } },
  );

  if (session.students?.length) {
    await User.updateMany(
      { _id: { $in: session.students } },
      { $pull: { enrolledSessions: sessionId } },
    );
  }

  await logActivity({
    userId: requestingUserId,
    action: 'deleted_session',
    targetModel: 'Session',
    targetId: sessionId,
  });

  return session;
};

exports.addStudentToSession = async (sessionId, studentId) => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  // Fast-path check, same caveat as enrollment.service.js: the query
  // guard on the update below is what actually closes the race.
  if (session.students.some((id) => id.toString() === studentId)) {
    throw new AppError('Student is already enrolled in this session', 400);
  }

  // Was already using $addToSet (so no duplicate could land in the
  // array), but findByIdAndUpdate with no `students` condition would
  // silently no-op and still return 200 on a race — the second of two
  // concurrent requests looked successful without actually being a
  // second enrollment. Matching only when studentId isn't already
  // present makes that race surface as the same 400 a sequential
  // duplicate call gets.
  const updatedSession = await Session.findOneAndUpdate(
    { _id: sessionId, students: { $ne: studentId } },
    { $addToSet: { students: studentId } },
    { new: true },
  )
    .populate('instructor', 'name email role')
    .populate('students', 'name email role');

  if (!updatedSession) {
    throw new AppError('Student is already enrolled in this session', 400);
  }

  await cascade.syncSessionEnrollment(studentId, sessionId);

  return updatedSession;
};

exports.removeStudentFromSession = async (sessionId, studentId) => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  if (!session.students.some((id) => id.toString() === studentId)) {
    throw new AppError('Student is not enrolled in this session', 400);
  }

  const updatedSession = await Session.findByIdAndUpdate(
    sessionId,
    { $pull: { students: studentId } },
    { new: true },
  )
    .populate('instructor', 'name email role')
    .populate('students', 'name email role');

  await cascade.unsyncSessionEnrollment(studentId, sessionId);

  return updatedSession;
};

exports.getSessionsByInstructor = async (
  instructorId,
  query,
  requestingUser = null,
) => {
  // #1.1/#1.2: this endpoint previously applied neither the draft filter
  // nor the url/embedUrl/resources/progress redaction getAllSessions
  // already had — same fix as getSessionsByTrack below, applied here too
  // for consistency (Q2: "apply the same privacy principle consistently
  // across all session read endpoints").
  const scope = await policy.loadStaffScope({}, requestingUser);
  const features = new APIFeatures(Session.find(), query, Session)
    .filter(
      policy.andFilters(
        policy.manageableListFilter(requestingUser, scope, 'session'),
        { instructor: instructorId },
      ),
    )
    .search(['title', 'description'])
    .sort()
    .limitFields();

  await features.paginate();

  const sessions = await features.query
    .populate('instructor', 'name email role')
    .populate('students', 'role');

  return {
    sessions: sanitizeSessionList(sessions, requestingUser, scope) || [],
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};

exports.getSessionsByTrack = async (trackId, query, requestingUser = null) => {
  // #1.1/#1.2: previously the one endpoint with NO sanitization at all —
  // a draft session's `url` (and the full per-student `progress` array)
  // reached any caller, including students, via this exact path.
  const scope = await policy.loadStaffScope({}, requestingUser);
  const features = new APIFeatures(Session.find(), query, Session)
    .filter(
      policy.andFilters(
        policy.manageableListFilter(requestingUser, scope, 'session'),
        { tracks: trackId },
      ),
    )
    .search(['title', 'description'])
    .sort()
    .limitFields();

  await features.paginate();

  const sessions = await features.query
    .populate('instructor', 'name email role')
    .populate('students', 'role');

  return {
    sessions: sanitizeSessionList(sessions, requestingUser, scope) || [],
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};

/**
 * Get all sessions a student is enrolled in
 * @param {string} studentId - MongoDB user ID
 * @param {Object} query - Filtering options
 * @returns {Promise<{sessions: Array, total: Number}>}
 */
exports.setSessionProgress = async (sessionId, requestingUser, status) => {
  const session = await Session.findById(sessionId).select(
    'students tracks course',
  );
  if (!session) {
    throw new AppError('Session not found', 404);
  }

  const userId = requestingUser.id;
  const isDirectStudent = session.students.some(
    (id) => id.toString() === userId,
  );
  let isEnrolled = isDirectStudent;

  if (!isEnrolled && session.tracks?.length) {
    const track = await Track.findOne({
      _id: { $in: session.tracks },
      students: userId,
    }).select('_id');
    isEnrolled = !!track;
  }

  if (!isEnrolled && session.course) {
    const course = await Course.findOne({
      _id: session.course,
      students: userId,
    }).select('_id');
    isEnrolled = !!course;
  }

  if (!isEnrolled) {
    throw new AppError(
      'Only enrolled students can track progress on this session',
      403,
    );
  }

  // Same atomic replace-in-place pattern as
  // weeklyTask.service.js#setItemCompletion (see the T16 comment there):
  // filter out any existing entry for this student, then append the new
  // one, in a single update so a crash mid-write can't leave duplicate
  // or missing progress entries.
  await Session.updateOne({ _id: sessionId }, [
    {
      $set: {
        progress: {
          $concatArrays: [
            {
              $filter: {
                input: { $ifNull: ['$progress', []] },
                cond: { $ne: [{ $toString: '$$this.student' }, userId] },
              },
            },
            [
              {
                student: { $toObjectId: userId },
                status,
                watchedAt: '$$NOW',
              },
            ],
          ],
        },
      },
    },
  ]);

  await logActivity({
    userId,
    action: 'marked_session_watched',
    targetModel: 'Session',
    targetId: sessionId,
  });

  const updated = await Session.findById(sessionId).select('progress');
  const myEntry = updated.progress.find((p) => p.student.toString() === userId);
  return { status: myEntry.status, watchedAt: myEntry.watchedAt };
};

exports.getSessionsByStudent = async (
  studentId,
  query,
  requestingUser = null,
) => {
  // Route-level guard (session.route.js) already restricts the caller to
  // the student themselves or an admin. Package 2: this list now goes
  // through the same Q5 draft filter and sanitizeSessionList() (Q7, #1.2)
  // as every other session list - a session the student is enrolled in
  // that was later unpublished is hidden (unless the caller manages it or
  // is an admin), and `students`/`progress` are replaced by `isEnrolled`
  // / `studentCount`. url/embedUrl/resources stay visible to the enrolled
  // student (sanitizeSessionList keeps them for direct students).
  const scope = await policy.loadStaffScope({}, requestingUser);
  const features = new APIFeatures(Session.find(), query, Session)
    .filter(
      policy.andFilters(
        policy.manageableListFilter(requestingUser, scope, 'session'),
        { students: studentId },
      ),
    )
    .sort()
    .limitFields();

  await features.paginate();

  const sessions = await features.query.populate(
    'instructor',
    'name email role',
  );

  return {
    sessions: sanitizeSessionList(sessions, requestingUser, scope) || [],
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};
