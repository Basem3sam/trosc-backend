const router = require('express').Router();

const { authLimiter } = require('../../middlewares/rateLimit.middleware');

// Auth-sensitive endpoints get the stricter limiter, applied here instead
// of by full path in app.js — keeps the rule scoped to this version.
router.use('/users/login', authLimiter);
router.use('/users/signup', authLimiter);
router.use('/users/forgotPassword', authLimiter);
router.use('/users/resetPassword', authLimiter);

router.use('/users', require('./user.route'));
router.use('/tracks', require('./track.route'));
router.use('/sessions', require('./session.route'));
router.use('/courses', require('./course.route'));
router.use('/events', require('./event.route'));
router.use('/announcements', require('./announcement.route'));
router.use('/feed', require('./feed.route'));
router.use('/contact', require('./contact.route'));
router.use('/weekly-tasks', require('./weeklyTaskProgress.route'));
router.use('/assignments', require('./assignmentSubmission.route'));
router.use('/activity-logs', require('./activityLog.route'));
router.use('/dashboard-stats', require('./dashboardStats.route'));

module.exports = router;
