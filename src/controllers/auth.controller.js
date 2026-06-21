const catchAsync = require('../utils/catchAsync');
const authService = require('../services/auth.service');

const setAuthCookie = (res, token) => {
  const days = parseInt(process.env.JWT_COOKIE_EXPIRES_IN, 10) || 7; // Default to 7 days if not set

  const cookieOptions = {
    expires: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: 'strict', // for CSRF protection
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);
};

exports.signup = catchAsync(async (req, res, next) => {
  const url = `${req.protocol}://${req.get('host')}/me`;
  const { token, user } = await authService.signUp(req.body, url);

  setAuthCookie(res, token);

  res.status(201).json({
    status: 'success',
    token,
    data: { user },
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const { token, user } = await authService.login(email, password);

  setAuthCookie(res, token);

  res.status(200).json({
    status: 'success',
    token,
    data: { user },
  });
});

exports.logout = catchAsync(async (req, res, next) => {
  authService.logoutUser(res);

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully!',
  });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  await authService.forgotPassword(req.body.email);

  res.status(200).json({
    status: 'success',
    message:
      'If an account exists, a reset link has been sent. Please check your email.',
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { password, passwordConfirm } = req.body;
  const { token, user } = await authService.resetPassword(
    req.params.token,
    password,
    passwordConfirm,
  );

  setAuthCookie(res, token);

  res.status(200).json({
    status: 'success',
    token,
    data: { user },
  });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { passwordCurrent, password, passwordConfirm } = req.body;
  const { token, user } = await authService.updatePassword(
    req.user.id,
    passwordCurrent,
    password,
    passwordConfirm,
  );

  setAuthCookie(res, token);

  res.status(200).json({
    status: 'success',
    token,
    data: { user },
  });
});
