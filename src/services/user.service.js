const APIFeatures = require('../utils/APIFeatures');
const User = require('../models/user.model');
const AppError = require('../utils/AppError');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getAllUsers = async (query) => {
  const features = new APIFeatures(User.find(), query, User)
    .filter({ active: { $ne: false } })
    .sort()
    .limitFields();

  await features.paginate();

  const users = await features.query;
  return {
    users: users || [],
    total: features.totalDocs || 0,
    pagination: features.pagination,
  };
};

exports.getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) throw new AppError('No user found with that ID', 404);
  return user;
};

exports.createUser = async (userData) => {
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw new AppError('Email already in use. Please try another one.', 400);
  }

  const newUser = await User.create({
    name: userData.name,
    email: userData.email,
    role: userData.role || 'student',
    password: userData.password,
    passwordConfirm: userData.passwordConfirm,
    photo: userData.photo,
    bio: userData.bio,
    website: userData.website,
    socialMedia: userData.socialMedia,
    active: userData.active,
    emailVerified: userData.emailVerified,
  });

  newUser.password = undefined;

  return newUser;
};

exports.updateUser = async (id, data) => {
  if (data.password || data.passwordConfirm) {
    throw new AppError('This route is not for password updates.', 400);
  }

  const user = await User.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!user) throw new AppError('No user found with that ID', 404);
  return user;
};

exports.deleteUser = async (id) => {
  const user = await User.findByIdAndDelete(id);
  if (!user) throw new AppError('No user found with that ID', 404);
  return null;
};

exports.getMe = async (userId) => {
  const user = await User.findById(userId).select('-password');
  if (!user) throw new AppError('User not found', 404);
  return user;
};

exports.updateMe = async (userId, data) => {
  if (data.password || data.passwordConfirm) {
    throw new AppError(
      'This route is not for password update. Please use /updateMyPassword.',
      400,
    );
  }
  const filteredData = filterObj(
    data,
    'name',
    'email',
    'photo',
    'bio',
    'website',
    'socialMedia',
  );

  if (data.email) {
    const existing = await User.findOne({
      email: data.email,
      _id: { $ne: userId },
    });
    if (existing) throw new AppError('Email already in use', 409);
  }

  const current = await User.findById(userId).select('email');
  if (current.email !== data.email) {
    filteredData.emailVerified = false;
  }

  const updatedUser = await User.findByIdAndUpdate(userId, filteredData, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) throw new AppError('User not found', 404);

  return updatedUser;
};

exports.deleteMe = async (userId) => {
  await User.findByIdAndUpdate(userId, { active: false });
  return null;
};

exports.bulkUserAction = async (userIds, action, requestingUserId) => {
  if (userIds.map(String).includes(String(requestingUserId))) {
    throw new AppError(
      'You cannot perform bulk actions on your own account',
      403,
    );
  }

  const admins = await User.find({ _id: { $in: userIds }, role: 'admin' });
  if (admins.length > 0) {
    throw new AppError('Bulk actions cannot target admin accounts', 403);
  }

  if (action === 'activate') {
    await User.updateMany({ _id: { $in: userIds } }, { active: true });
  } else if (action === 'deactivate') {
    await User.updateMany({ _id: { $in: userIds } }, { active: false });
  } else if (action === 'delete') {
    await User.deleteMany({ _id: { $in: userIds } });
  }
};
