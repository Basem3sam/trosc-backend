const Session = require('../models/session.model');
const APIFeatures = require('../utils/APIFeatures');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

exports.createSession = catchAsync(async (sessionData) => {
  const session = await Session.create(sessionData);
  return await Session.findById(session._id).populate(
    'instructor',
    'name email role',
  );
});

exports.getAllSessions = catchAsync(async (query) => {
  const features = new APIFeatures(Session.find(), query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const sessions = await features.query.populate(
    'instructor',
    'name email role',
  );
  return sessions;
});

exports.getSessionById = catchAsync(async (sessionId) => {
  const session = await Session.findById(sessionId)
    .populate('instructor', 'name email role')
    .populate('students', 'name email role')
    .populate('track', 'name description');

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  return session;
});

exports.updateSession = catchAsync(async (sessionId, updateData) => {
  const session = await Session.findByIdAndUpdate(sessionId, updateData, {
    new: true,
    runValidators: true,
  })
    .populate('instructor', 'name email role')
    .populate('students', 'name email role')
    .populate('track', 'name description');

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  return session;
});

exports.deleteSession = catchAsync(async (sessionId) => {
  const session = await Session.findByIdAndDelete(sessionId);

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  return session;
});

exports.addStudentToSession = catchAsync(async (sessionId, studentId) => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  // Check if student already exists in the session
  if (session.students.includes(studentId)) {
    throw new AppError('Student is already enrolled in this session', 400);
  }

  session.students.push(studentId);
  await session.save();

  return await Session.findById(sessionId)
    .populate('instructor', 'name email role')
    .populate('students', 'name email role');
});

exports.removeStudentFromSession = catchAsync(async (sessionId, studentId) => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  // Check if student exists in the session
  if (!session.students.includes(studentId)) {
    throw new AppError('Student is not enrolled in this session', 400);
  }

  session.students = session.students.filter(
    (student) => student.toString() !== studentId,
  );
  await session.save();

  return await Session.findById(sessionId)
    .populate('instructor', 'name email role')
    .populate('students', 'name email role');
});

exports.getSessionsByInstructor = catchAsync(async (instructorId, query) => {
  const features = new APIFeatures(
    Session.find({ instructor: instructorId }),
    query,
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const sessions = await features.query.populate(
    'instructor',
    'name email role',
  );
  return sessions;
});

exports.getSessionsByTrack = catchAsync(async (trackId, query) => {
  const features = new APIFeatures(Session.find({ track: trackId }), query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const sessions = await features.query.populate(
    'instructor',
    'name email role',
  );
  return sessions;
});
