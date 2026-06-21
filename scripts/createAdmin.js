// scripts/createAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user.model');

(async () => {
  await mongoose.connect(process.env.DATABASE_URL);

  const email = process.argv[2];
  if (!email) {
    console.log('Usage: node scripts/createAdmin.js <email>');
    process.exit(1);
  }

  const user = await User.findOneAndUpdate(
    { email },
    { role: 'admin' },
    { new: true },
  );

  if (!user) {
    console.log('No user found with that email. Sign up first, then run this.');
  } else {
    console.log(`✅ ${user.email} is now an admin.`);
  }

  await mongoose.disconnect();
})();
