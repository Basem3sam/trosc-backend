const Event = require('../models/event.model');
const AppError = require('../utils/AppError');
const APIFeatures = require('../utils/APIFeatures');

exports.createEvent = async (data) => {
  const event = await Event.create(data);
  return await Event.findById(event._id).populate(
    'createdBy',
    'name photo role',
  );
};

exports.getAllEvents = async (query) => {
  const features = new APIFeatures(Event.find(), query, Event)
    .filter()
    .sort()
    .limitFields();

  await features.paginate();
  const events = await features.query.populate('createdBy', 'name photo role');
  return {
    events: events || [],
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};

exports.getEventById = async (id) => {
  const event = await Event.findById(id)
    .populate('createdBy', 'name photo role')
    .populate('attendees', 'name photo');
  if (!event) throw new AppError('Event not found', 404);
  return event;
};

exports.updateEvent = async (id, data) => {
  const event = await Event.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).populate('createdBy', 'name photo role');

  if (!event) throw new AppError('Event not found', 404);
  return event;
};

exports.deleteEvent = async (id) => {
  const event = await Event.findByIdAndDelete(id);
  if (!event) throw new AppError('Event not found', 404);
  return null;
};

exports.rsvpEvent = async (eventId, userId) => {
  const event = await Event.findById(eventId);
  if (!event) throw new AppError('Event not found', 404);

  if (event.attendees.some((id) => id.toString() === userId)) {
    throw new AppError('You have already RSVPd to this event', 400);
  }

  event.attendees.push(userId);
  await event.save();
  return await Event.findById(eventId).populate('attendees', 'name photo');
};

exports.cancelRsvp = async (eventId, userId) => {
  const event = await Event.findById(eventId);
  if (!event) throw new AppError('Event not found', 404);

  if (!event.attendees.some((id) => id.toString() === userId)) {
    throw new AppError('You are not attending this event', 400);
  }

  event.attendees.pull(userId);
  await event.save();
  return event;
};

exports.getMyEvents = async (userId, query) => {
  const features = new APIFeatures(Event.find(), query, Event)
    .filter({ attendees: userId })
    .sort()
    .limitFields();

  await features.paginate();
  const events = await features.query.populate('createdBy', 'name photo role');
  return {
    events: events || [],
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};
