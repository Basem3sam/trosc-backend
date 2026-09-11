const Announcement = require('../models/announcement.model');
const AppError = require('../utils/AppError');
const APIFeatures = require('../utils/APIFeatures');

// ===================================================================
// 🎯 AUDIENCE TARGETING
// ===================================================================
// GET /announcements and GET /announcements/:id are both public routes
// (no `protect` middleware — see announcement.route.js), so `requestingUser`
// may be undefined/null for anonymous visitors. That mirrors the pattern
// already used by track.service.js's getTrackDetails: build the visibility
// rule defensively with optional chaining rather than requiring auth.
//
// Visibility rules:
//   - Admins see everything, regardless of audience targeting.
//   - The announcement's own creator always sees it (mainly so an
//     instructor can find/manage their own posts even if they aren't
//     personally enrolled in the track/course they targeted).
//   - Everyone else sees audience: 'all' announcements, plus 'track'/
//     'course' announcements scoped to a track/course they're enrolled in.

// Mongo filter used for the list endpoint (GET /announcements). Combined
// with the rest of APIFeatures' query as a defaultFilter so it also feeds
// the pagination count, not just the returned page.
const buildAudienceFilter = (requestingUser) => {
  if (requestingUser?.role === 'admin') return {};

  const conditions = [{ audience: 'all' }];

  if (requestingUser) {
    conditions.push({ createdBy: requestingUser.id });

    if (requestingUser.enrolledTrack) {
      conditions.push({
        audience: 'track',
        targetTrack: requestingUser.enrolledTrack,
      });
    }

    if (requestingUser.enrolledCourses?.length) {
      conditions.push({
        audience: 'course',
        targetCourse: { $in: requestingUser.enrolledCourses },
      });
    }
  }

  return { $or: conditions };
};

// Exposed so other places that query announcements directly — currently
// feed.controller.js's pinned-announcements query — apply the exact same
// visibility rule instead of re-deriving (and risking drifting from) it.
exports.getAudienceFilter = buildAudienceFilter;

// Equivalent check for a single already-fetched announcement (GET
// /announcements/:id), which can't be expressed as a Mongo query since the
// document is already in hand. Keep the rules above in sync with this.
const canViewAnnouncement = (announcement, requestingUser) => {
  if (requestingUser?.role === 'admin') return true;
  if (
    requestingUser &&
    announcement.createdBy?._id?.toString() === requestingUser.id
  ) {
    return true;
  }
  if (announcement.audience === 'all') return true;

  if (announcement.audience === 'track') {
    return !!(
      requestingUser?.enrolledTrack &&
      announcement.targetTrack &&
      requestingUser.enrolledTrack.toString() ===
        announcement.targetTrack.toString()
    );
  }

  if (announcement.audience === 'course') {
    return !!(
      requestingUser?.enrolledCourses?.length &&
      announcement.targetCourse &&
      requestingUser.enrolledCourses.some(
        (courseId) =>
          courseId.toString() === announcement.targetCourse.toString(),
      )
    );
  }

  return false;
};

// ===================================================================
// 📌 CRUD
// ===================================================================

exports.createAnnouncement = async (data) => {
  const ann = await Announcement.create(data);
  return Announcement.findById(ann._id).populate(
    'createdBy',
    'name photo role',
  );
};

exports.getAnnouncements = async (query, requestingUser = null) => {
  // Pinned announcements first, then newest
  const baseQuery = Announcement.find().sort({ isPinned: -1, createdAt: -1 });
  const features = new APIFeatures(baseQuery, query, Announcement)
    .filter(buildAudienceFilter(requestingUser))
    .search(['title', 'message'])
    .limitFields();

  await features.paginate();
  const announcements = await features.query.populate(
    'createdBy',
    'name photo role',
  );
  return {
    announcements: announcements || [],
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};

exports.getAnnouncementById = async (id, requestingUser = null) => {
  const ann = await Announcement.findById(id).populate(
    'createdBy',
    'name photo role',
  );
  if (!ann) throw new AppError('Announcement not found', 404);

  if (!canViewAnnouncement(ann, requestingUser)) {
    // 404, not 403: don't reveal to someone outside the announcement's
    // audience that a targeted announcement exists at all.
    throw new AppError('Announcement not found', 404);
  }

  return ann;
};

exports.updateAnnouncement = async (id, data) => {
  const ann = await Announcement.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).populate('createdBy', 'name photo role');

  if (!ann) throw new AppError('Announcement not found', 404);
  return ann;
};

exports.deleteAnnouncement = async (id) => {
  const ann = await Announcement.findByIdAndDelete(id);
  if (!ann) throw new AppError('Announcement not found', 404);
  return null;
};
