const Event = require('../models/event.model');
const AppError = require('../utils/AppError');
const APIFeatures = require('../utils/APIFeatures');
const { logActivity } = require('./activityLog.service');

exports.createEvent = async (data, requestingUserId) => {
  const event = await Event.create(data);
  await logActivity({
    userId: requestingUserId,
    action: 'created_event',
    targetModel: 'Event',
    targetId: event._id,
  });
  return Event.findById(event._id).populate('createdBy', 'name photo role');
};

exports.getAllEvents = async (query) => {
  const features = new APIFeatures(Event.find(), query, Event)
    .filter()
    .search(['title', 'description'])
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

exports.updateEvent = async (id, data, requestingUserId) => {
  const event = await Event.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).populate('createdBy', 'name photo role');

  if (!event) throw new AppError('Event not found', 404);

  await logActivity({
    userId: requestingUserId,
    action: 'updated_event',
    targetModel: 'Event',
    targetId: id,
  });

  return event;
};

exports.deleteEvent = async (id, requestingUserId) => {
  const event = await Event.findByIdAndDelete(id);
  if (!event) throw new AppError('Event not found', 404);

  await logActivity({
    userId: requestingUserId,
    action: 'deleted_event',
    targetModel: 'Event',
    targetId: id,
  });

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

  await logActivity({
    userId,
    action: 'rsvped_to_event',
    targetModel: 'Event',
    targetId: eventId,
  });

  return Event.findById(eventId).populate('attendees', 'name photo');
};

exports.cancelRsvp = async (eventId, userId) => {
  const event = await Event.findById(eventId);
  if (!event) throw new AppError('Event not found', 404);

  if (!event.attendees.some((id) => id.toString() === userId)) {
    throw new AppError('You are not attending this event', 400);
  }

  event.attendees.pull(userId);
  await event.save();

  await logActivity({
    userId,
    action: 'cancelled_event_rsvp',
    targetModel: 'Event',
    targetId: eventId,
  });

  return event;
};

exports.getMyEvents = async (userId, query) => {
  const features = new APIFeatures(Event.find(), query, Event)
    .filter({ attendees: userId })
    .search(['title', 'message'])
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
