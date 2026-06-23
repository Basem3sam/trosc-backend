const Announcement = require('../models/announcement.model');
const AppError = require('../utils/AppError');
const APIFeatures = require('../utils/APIFeatures');

exports.createAnnouncement = async (data) => {
  const ann = await Announcement.create(data);
  return await Announcement.findById(ann._id).populate(
    'createdBy',
    'name photo role',
  );
};

exports.getAnnouncements = async (query) => {
  // Pinned announcements first, then newest
  const baseQuery = Announcement.find().sort({ isPinned: -1, createdAt: -1 });
  const features = new APIFeatures(baseQuery, query, Announcement)
    .filter()
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

exports.getAnnouncementById = async (id) => {
  const ann = await Announcement.findById(id).populate(
    'createdBy',
    'name photo role',
  );
  if (!ann) throw new AppError('Announcement not found', 404);
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
