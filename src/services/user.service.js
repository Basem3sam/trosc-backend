const APIFeatures = require('../utils/APIFeatures');
const User = require('../models/user.model');
const Track = require('../models/track.model');
const AppError = require('../utils/AppError');
const { logActivity } = require('./activityLog.service');
const cascade = require('./cascade.service');

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

exports.createUser = async (userData, requestingUserId) => {
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

  await logActivity({
    userId: requestingUserId,
    action: 'created_user',
    targetModel: 'User',
    targetId: newUser._id,
  });

  return newUser;
};

exports.updateUser = async (id, data) => {
  if (data.password || data.passwordConfirm) {
    throw new AppError('This route is not for password updates.', 400);
  }

  // Defense-in-depth: the route's Joi schema (adminUpdateUserSchema)
  // already rejects unknown keys, but this service shouldn't rely on
  // that being the only gate — filter here too, same as updateMe, so
  // a future route/script that reuses this function without going
  // through Joi validation can't mass-assign arbitrary fields.
  const filteredData = filterObj(
    data,
    'name',
    'email',
    'role',
    'photo',
    'bio',
    'website',
    'socialMedia',
    'active',
    'emailVerified',
  );

  const user = await User.findByIdAndUpdate(id, filteredData, {
    new: true,
    runValidators: true,
  });

  if (!user) throw new AppError('No user found with that ID', 404);
  return user;
};

exports.deleteUser = async (id, requestingUserId) => {
  const user = await User.findById(id);
  if (!user) throw new AppError('No user found with that ID', 404);

  await cascade.hardDeleteUserCascade(id);

  await logActivity({
    userId: requestingUserId,
    action: 'deleted_user',
    targetModel: 'User',
    targetId: id,
  });

  return null;
};

exports.getMe = async (userId) => {
  const user = await User.findById(userId).select('-password');
  if (!user) throw new AppError('User not found', 404);

  // pendingTrack: the track (if any) the user has applied to via
  // enrollMeInTrack but isn't approved into yet. Track.pendingStudents is
  // the existing source of truth for that (see enrollment.service.js's
  // enrollMeInTrack/approveStudentInTrack/rejectStudentInTrack, which are
  // the only writers of this array) — this just surfaces it on /users/me
  // rather than introducing a second place that tracks the same state.
  const pendingTrack = await Track.findOne({ pendingStudents: userId })
    .select('_id')
    .lean();

  const userObj = user.toObject();
  userObj.pendingTrack = pendingTrack ? pendingTrack._id : null;

  return userObj;
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
  if (data.email && current.email !== data.email) {
    filteredData.emailVerified = false;
  }

  const updatedUser = await User.findByIdAndUpdate(userId, filteredData, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) throw new AppError('User not found', 404);

  await logActivity({ userId, action: 'updated_profile' });

  return updatedUser;
};

exports.deleteMe = async (userId) => {
  await User.findByIdAndUpdate(userId, { active: false });
  await logActivity({ userId, action: 'deactivated_account' });
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
    // Sequential, not Promise.all: hardDeleteUserCascade opens its own
    // transaction per user, and if one user in the batch owns content
    // that blocks deletion (see cascade.service.js), the rest should
    // still be processed rather than the whole batch failing atomically
    // on one bad ID.
    const failures = [];
    // Sequential by design (see comment above this block).
    // eslint-disable-next-line no-restricted-syntax
    for (const targetId of userIds) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await cascade.hardDeleteUserCascade(targetId);
      } catch (err) {
        failures.push({ userId: targetId, reason: err.message });
      }
    }
    if (failures.length) {
      throw new AppError(
        `${failures.length} of ${userIds.length} user(s) could not be deleted: ` +
          `${failures.map((f) => `${f.userId} (${f.reason})`).join('; ')}`,
        409,
      );
    }
  }

  await logActivity({
    userId: requestingUserId,
    action: 'bulk_user_action',
    metadata: { targetUserIds: userIds, bulkAction: action },
  });
};
