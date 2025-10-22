const SessionService = require('../services/session.service');
const catchAsync = require('../utils/catchAsync');

const sessionController = {
  // Create a new session
  createSession: catchAsync(async (req, res, next) => {
    const session = await SessionService.createSession(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        session,
      },
    });
  }),

  // Get all sessions
  getAllSessions: catchAsync(async (req, res, next) => {
    const sessions = await SessionService.getAllSessions(req.query);

    res.status(200).json({
      status: 'success',
      results: sessions.length,
      data: {
        sessions,
      },
    });
  }),

  // Get single session
  getSession: catchAsync(async (req, res, next) => {
    const session = await SessionService.getSessionById(req.params.id);

    res.status(200).json({
      status: 'success',
      data: {
        session,
      },
    });
  }),

  // Update session
  updateSession: catchAsync(async (req, res, next) => {
    const session = await SessionService.updateSession(req.params.id, req.body);

    res.status(200).json({
      status: 'success',
      data: {
        session,
      },
    });
  }),

  // Delete session
  deleteSession: catchAsync(async (req, res, next) => {
    await SessionService.deleteSession(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  }),

  // Add student to session
  addStudent: catchAsync(async (req, res, next) => {
    const session = await SessionService.addStudentToSession(
      req.params.id,
      req.body.studentId,
    );

    res.status(200).json({
      status: 'success',
      data: {
        session,
      },
    });
  }),

  // Remove student from session
  removeStudent: catchAsync(async (req, res, next) => {
    const session = await SessionService.removeStudentFromSession(
      req.params.id,
      req.params.studentId,
    );

    res.status(200).json({
      status: 'success',
      data: {
        session,
      },
    });
  }),

  // Get sessions by instructor
  getSessionsByInstructor: catchAsync(async (req, res, next) => {
    const sessions = await SessionService.getSessionsByInstructor(
      req.params.instructorId,
      req.query,
    );

    res.status(200).json({
      status: 'success',
      results: sessions.length,
      data: {
        sessions,
      },
    });
  }),

  // Get sessions by track
  getSessionsByTrack: catchAsync(async (req, res, next) => {
    const sessions = await SessionService.getSessionsByTrack(
      req.params.trackId,
      req.query,
    );

    res.status(200).json({
      status: 'success',
      results: sessions.length,
      data: {
        sessions,
      },
    });
  }),
};

module.exports = sessionController;
