const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const selfApproval = catchAsync((req, res, next) => {
  if (req.user.id === req.params.studentId) {
    return next(new AppError('You cannot approve your own request', 403));
  }
  next();
});

module.exports = selfApproval;
