const Event = require('../models/event.model');
const Announcement = require('../models/announcement.model');
const catchAsync = require('../utils/catchAsync');

exports.getFeed = catchAsync(async (req, res, next) => {
  const now = new Date();

  const [announcements, upcomingEvents] = await Promise.all([
    // Pinned announcements, newest first
    Announcement.find({ isPinned: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('createdBy', 'name photo role'),

    // Next 3 upcoming events, soonest first
    Event.find({ date: { $gte: now } })
      .sort({ date: 1 })
      .limit(3)
      .populate('createdBy', 'name photo role'),
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      announcements,
      upcomingEvents,
    },
  });
});
