const mongoose = require('mongoose');

// Each test FILE gets its own Mongoose connection to the shared in-memory
// MongoDB instance (started once in globalSetup.js). Collections are wiped
// between individual tests so no test can see another test's data.

beforeAll(async () => {
  await mongoose.connect(process.env.DATABASE_URL);
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
});

afterAll(async () => {
  await mongoose.connection.close();
});
