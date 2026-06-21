const announcementService = require('../services/announcement.service');
const catchAsync = require('../utils/catchAsync');

exports.createAnnouncement = catchAsync(async (req, res, next) => {
  delete req.body.createdBy;
  req.body.createdBy = req.user.id;

  const announcement = await announcementService.createAnnouncement(req.body);

  res.status(201).json({
    status: 'success',
    data: { announcement },
  });
});

exports.getAllAnnouncements = catchAsync(async (req, res, next) => {
  const { announcements, total, pagination } =
    await announcementService.getAnnouncements(req.query);

  res.status(200).json({
    status: 'success',
    results: announcements.length,
    total,
    pagination,
    data: { announcements },
  });
});

exports.getAnnouncement = catchAsync(async (req, res, next) => {
  const announcement = await announcementService.getAnnouncementById(
    req.params.id,
  );

  res.status(200).json({
    status: 'success',
    data: { announcement },
  });
});

exports.updateAnnouncement = catchAsync(async (req, res, next) => {
  delete req.body.createdBy;
  const announcement = await announcementService.updateAnnouncement(
    req.params.id,
    req.body,
  );

  res.status(200).json({
    status: 'success',
    data: { announcement },
  });
});

exports.deleteAnnouncement = catchAsync(async (req, res, next) => {
  await announcementService.deleteAnnouncement(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
