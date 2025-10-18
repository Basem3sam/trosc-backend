const User = require('../models/user.model');
const AppError = require('../utils/AppError');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getAllUsers = async () => {
  const users = await User.find();
  return users;
};

exports.getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) throw new AppError('No user found with that ID', 404);
  return user;
};

exports.createUser = async (userData) => {
  // 1) Check if user with this email already exists
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw new AppError('Email already in use. Please try another one.', 400);
  }

  // 2) Create the new user
  const newUser = await User.create({
    name: userData.name,
    email: userData.email,
    role: userData.role || 'student',
    password: userData.password,
    passwordConfirm: userData.passwordConfirm,
  });

  // 3) Remove password from output
  newUser.password = undefined;

  return newUser;
};

exports.updateUser = async (id, data) => {
  // Prevent password updates here for safety
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
  // Only allow name, email, etc.
  const filteredData = filterObj(data, 'name', 'email', 'photo');

  const updatedUser = await User.findByIdAndUpdate(userId, filteredData, {
    new: true,
    runValidators: true,
  });

  return updatedUser;
};

exports.deleteMe = async (userId) => {
  await User.findByIdAndUpdate(userId, { active: false });
  return null;
};
