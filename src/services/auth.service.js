const crypto = require('crypto');
const User = require('../models/user.model');
const AppError = require('../utils/AppError');
const Email = require('../utils/Email');
const signToken = require('../utils/generateToken');

// Create and send token (with cookie)
const createSendToken = (user) => {
  const token = signToken(user._id);
  user.password = undefined;
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

  if (data.photo) {
    allowedData.photo = data.photo;
  }

  // Create user with ONLY allowed fields
  const newUser = await User.create(allowedData);

  // send email (business logic)
  await new Email(newUser, url).sendWelcome();

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

  // Update last login time
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  // If everything ok, send token to client
  const token = createSendToken(user);
  return { token, user };
};

exports.forgotPassword = async (email) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email });
  if (!user)
    throw new AppError('There is no user with that email address', 404);

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

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Log user in, send JWT
  const jwtToken = createSendToken(user);
  return { jwtToken, user };
};

exports.updatePassword = async (
  userId,
  currentPassword,
  newPassword,
  passwordConfirm,
) => {
  // 1) Get user from collection
  const user = await User.findById(userId).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(currentPassword, user.password))) {
    throw new AppError('Your current password is wrong', 401);
  }

  // 3) If so, update password
  user.password = newPassword;
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
