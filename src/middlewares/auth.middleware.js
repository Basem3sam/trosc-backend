const { promisify } = require('util');
const jwt = require('jsonwebtoken');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const User = require('../models/user.model');

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    [, token] = req.headers.authorization.split(' ');
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401),
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id).select(
    '+active +passwordChangedAt',
  );

  if (!currentUser || !currentUser.active) {
    return next(new AppError('User no longer exists', 401));
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401),
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  next();
});

// Like `protect`, but for routes that must stay reachable by anonymous
// users while still behaving differently for signed-in ones (e.g. the
// dashboard feed showing targeted announcements only to enrolled
// students). Populates req.user on a valid token; on a missing or
// invalid token it falls through as anonymous instead of rejecting.
exports.optionalAuth = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    [, token] = req.headers.authorization.split(' ');
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) return next();

  try {
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id).select(
      '+active +passwordChangedAt',
    );

    if (
      currentUser &&
      currentUser.active &&
      !currentUser.changedPasswordAfter(decoded.iat)
    ) {
      req.user = currentUser;
    }
  } catch (err) {
    // Expired/invalid token on an optional-auth route: proceed as
    // anonymous rather than failing the request.
  }

  next();
});

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    // roles ['admin', 'lead-guide']
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }
    next();
  };

exports.checkOwnership = require('./ownership.middleware').checkOwnership;
