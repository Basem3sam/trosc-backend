const Event = require('../models/event.model');
const Announcement = require('../models/announcement.model');
const catchAsync = require('../utils/catchAsync');
const { getAudienceFilter } = require('../services/announcement.service');

exports.getFeed = catchAsync(async (req, res, next) => {
  const now = new Date();

  const [announcements, upcomingEvents] = await Promise.all([
    // Pinned announcements, newest first — scoped to the same audience
    // visibility rule as GET /announcements (see announcement.service.js),
    // so a track/course-only pinned announcement doesn't leak to everyone
    // via the dashboard feed.
    Announcement.find({ isPinned: true, ...getAudienceFilter(req.user) })
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
