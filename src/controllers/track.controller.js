// controllers/track.controller.js

const trackService = require('../services/track.service');
const catchAsync = require('../utils/catchAsync');

exports.createTrack = catchAsync(async (req, res, next) => {
  // Add instructor from the logged-in user
  req.body.instructor = req.user.id;

  const track = await trackService.createTrack(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      track,
    },
  });
});

exports.getAllTracks = catchAsync(async (req, res, next) => {
  const { tracks, total } = await trackService.getAllTracks(req.query);

  res.status(200).json({
    status: 'success',
    results: tracks.length,
    total,
    data: {
      tracks,
    },
  });
});

exports.getTrack = catchAsync(async (req, res, next) => {
  const track = await trackService.getTrackById(req.params.id);

  res.status(200).json({
    status: 'success',
    data: {
      track,
    },
  });
});

exports.updateTrack = catchAsync(async (req, res, next) => {
  const track = await trackService.updateTrack(req.params.id, req.body);

  res.status(200).json({
    status: 'success',
    data: {
      track,
    },
  });
});

exports.deleteTrack = catchAsync(async (req, res, next) => {
  await trackService.deleteTrack(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// --- Session Management ---

exports.addSessionToTrack = catchAsync(async (req, res, next) => {
  const { trackId, sessionId } = req.params;
  const track = await trackService.addSessionToTrack(trackId, sessionId);

  res.status(200).json({
    status: 'success',
    message: 'Session added to track successfully.',
    data: {
      track,
    },
  });
});

exports.removeSessionFromTrack = catchAsync(async (req, res, next) => {
  const { trackId, sessionId } = req.params;
  const track = await trackService.removeSessionFromTrack(trackId, sessionId);

  res.status(200).json({
    status: 'success',
    message: 'Session removed from track successfully.',
    data: {
      track,
    },
  });
});
