const eventService = require('../services/event.service');
const catchAsync = require('../utils/catchAsync');

exports.createEvent = catchAsync(async (req, res, next) => {
  // Prevent spoofing
  delete req.body.createdBy;
  delete req.body.attendees;
  req.body.createdBy = req.user.id;

  const event = await eventService.createEvent(req.body);

  res.status(201).json({
    status: 'success',
    data: { event },
  });
});

exports.getAllEvents = catchAsync(async (req, res, next) => {
  const { events, total, pagination } = await eventService.getAllEvents(
    req.query,
  );

  res.status(200).json({
    status: 'success',
    results: events.length,
    total,
    pagination,
    data: { events },
  });
});

exports.getEvent = catchAsync(async (req, res, next) => {
  const event = await eventService.getEventById(req.params.id);

  res.status(200).json({
    status: 'success',
    data: { event },
  });
});

exports.updateEvent = catchAsync(async (req, res, next) => {
  // Prevent changing creator or attendee list via update
  delete req.body.createdBy;
  delete req.body.attendees;

  const event = await eventService.updateEvent(req.params.id, req.body);

  res.status(200).json({
    status: 'success',
    data: { event },
  });
});

exports.deleteEvent = catchAsync(async (req, res, next) => {
  await eventService.deleteEvent(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.rsvpEvent = catchAsync(async (req, res, next) => {
  const event = await eventService.rsvpEvent(req.params.id, req.user.id);

  res.status(200).json({
    status: 'success',
    message: 'RSVP confirmed',
    data: { event },
  });
});

exports.cancelRsvp = catchAsync(async (req, res, next) => {
  const event = await eventService.cancelRsvp(req.params.id, req.user.id);

  res.status(200).json({
    status: 'success',
    message: 'RSVP cancelled',
    data: { event },
  });
});

exports.getMyEvents = catchAsync(async (req, res, next) => {
  const { events, total, pagination } = await eventService.getMyEvents(
    req.user.id,
    req.query,
  );

  res.status(200).json({
    status: 'success',
    results: events.length,
    total,
    pagination,
    data: { events },
  });
});
