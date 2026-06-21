const crypto = require('crypto');
const User = require('../models/user.model');
const AppError = require('../utils/AppError');
const Email = require('../utils/Email');
const signToken = require('../utils/generateToken');

// Create and send token (with cookie)
const createSendToken = (user) => {
  if (!user || !user._id) {
    throw new AppError('Invalid user for token generation', 500);
  }
  const token = signToken(user._id);
  user.password = undefined; // Remove password from output
  return token;
};

// ==============================
// 🔸 Auth Service Functions
// ==============================

exports.signUp = async (data, url) => {
  const allowedData = {
    name: data.name,
    email: data.email,
    password: data.password,
    passwordConfirm: data.passwordConfirm,
  };

  if (data.photo) allowedData.photo = data.photo;
  if (data.bio) allowedData.bio = data.bio;
  if (data.website) allowedData.website = data.website;
  if (data.socialMedia) allowedData.socialMedia = data.socialMedia;

  // Create user with ONLY allowed fields
  const newUser = await User.create(allowedData);

  // send email (fire-and-forget; don't fail the HTTP request if SMTP breaks)
  try {
    await new Email(newUser, url).sendWelcome();
  } catch (err) {
    console.error('Welcome email failed:', err.message);
    // TODO: send to a logging service (e.g., Sentry) instead of console
  }

  const token = createSendToken(newUser);
  return { token, user: newUser };
};

exports.login = async (email, password) => {
  // Check if email and password exist
  if (!email || !password) {
    throw new AppError('Please provide email and password.', 400);
  }

  // (note) we added .select(+[field]) to select a field the select of it is false
  const user = await User.findOne({ email }).select('+password');

  // Check if user exists && password is correct
  if (!user || !(await user.correctPassword(password, user.password))) {
    throw new AppError('Incorrect email or password', 401);
  }
  if (!user.active) {
    throw new AppError(
      'Your account has been deactivated. Contact support.',
      401,
    );
  }

  // Update last login time
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // If everything ok, send token to client
  const token = createSendToken(user);
  return { token, user };
};

exports.forgotPassword = async (email) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email });
  if (!user || !user.active) {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Artificial delay to prevent email enumeration
    return; // Do not reveal if user exists or not for security reasons
  }

  // 2) Generate the random token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  // 3) Send it to user's email
  try {
    await new Email(user, resetURL).sendPasswordReset();
  } catch (err) {
    // If sending fails, reset token data and save again
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw new AppError('Error sending the email. Try again later!', 500);
  }
};

exports.resetPassword = async (token, password, passwordConfirm) => {
  // 1) Get user based on the token
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gte: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password

  if (!user) throw new AppError('Token is invalid or has expired', 400);

  if (!user.active) throw new AppError('Account deactivated', 401);

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Log user in, send JWT
  const jwtToken = createSendToken(user);
  return { token: jwtToken, user }; // Changed from jwtToken to token for consistency
};

exports.updatePassword = async (
  userId,
  passwordCurrent,
  password,
  passwordConfirm,
) => {
  // simple validation
  if (!passwordCurrent || !password || !passwordConfirm) {
    throw new AppError('All password fields are required', 400);
  }

  // 1) Get user from collection
  const user = await User.findById(userId).select('+password');

  if (!user) throw new AppError('User not found', 404);

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(passwordCurrent, user.password))) {
    throw new AppError('Your current password is wrong', 401);
  }

  // 3) If so, update password
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save();

  // 4) Log user in, send JWT
  const token = createSendToken(user);
  return { token, user };
};

exports.logoutUser = (res) => {
  // Overwrite cookie with an expired dummy token
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000), // expires in 10s
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
};
