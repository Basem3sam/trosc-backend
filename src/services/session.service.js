const Session = require('../models/session.model');
const Course = require('../models/course.model');
const Track = require('../models/track.model');
const APIFeatures = require('../utils/APIFeatures');
const AppError = require('../utils/AppError');

exports.createSession = async (sessionData) => {
  const session = await Session.create(sessionData);
  return await Session.findById(session._id).populate(
    'instructor',
    'name email role',
  );
};

exports.getAllSessions = async (query) => {
  const features = new APIFeatures(Session.find(), query, Session)
    .filter()
    .sort()
    .limitFields();

  await features.paginate();

  const sessions = await features.query.populate(
    'instructor',
    'name email role',
  );

  return {
    sessions: sessions || [],
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};

exports.getSessionById = async (sessionId) => {
  const session = await Session.findById(sessionId)
    .populate('instructor', 'name email role')
    .populate('students', 'name email role')
    .populate('tracks', 'title description');

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  // Add embed URL for frontend convenience
  const sessionObj = session.toObject();
  if (sessionObj.url) {
    const youtubeMatch = sessionObj.url.match(
      /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    );
    if (youtubeMatch) {
      sessionObj.embedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }

    const driveMatch = sessionObj.url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      sessionObj.embedUrl = `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }
  }

  return sessionObj;
};

exports.updateSession = async (sessionId, updateData) => {
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
    { path: 'track', select: 'title description' },
  ]);

  return session;
};

exports.deleteSession = async (sessionId) => {
  const session = await Session.findByIdAndDelete(sessionId);

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  // Remove from every Course and Track that still lists it
  await Course.updateMany(
    { sessions: sessionId },
    { $pull: { sessions: sessionId } },
  );
  await Track.updateMany(
    { sessions: sessionId },
    { $pull: { sessions: sessionId } },
  );

  return session;
};

exports.addStudentToSession = async (sessionId, studentId) => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  if (session.students.some((id) => id.toString() === studentId)) {
    throw new AppError('Student is already enrolled in this session', 400);
  }

  const updatedSession = await Session.findByIdAndUpdate(
    sessionId,
    { $addToSet: { students: studentId } },
    { new: true },
  )
    .populate('instructor', 'name email role')
    .populate('students', 'name email role');

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

  return updatedSession;
};

exports.getSessionsByInstructor = async (instructorId, query) => {
  const features = new APIFeatures(Session.find(), query, Session)
    .filter({ instructor: instructorId })
    .sort()
    .limitFields();

  await features.paginate();

  const sessions = await features.query.populate(
    'instructor',
    'name email role',
  );
  return {
    sessions: sessions || [],
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};

exports.getSessionsByTrack = async (trackId, query) => {
  const features = new APIFeatures(Session.find(), query, Session)
    .filter({ tracks: trackId })
    .sort()
    .limitFields();

  await features.paginate();

  const sessions = await features.query.populate(
    'instructor',
    'name email role',
  );
  return { sessions: sessions || [], total: features.totalDocs || 0, pagination: features.pagination};
};
