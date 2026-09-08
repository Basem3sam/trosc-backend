const dotenv = require('dotenv');
const path = require('path');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

module.exports = async () => {
  // Load test-only env vars (JWT secret, rate-limit overrides, etc.)
  dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

  // One real (but in-memory, throwaway) MongoDB **replica set** for the whole test run.
  // This enables MongoDB transactions (required by cascade.service.js).
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  const uri = replSet.getUri();

  process.env.DATABASE_URL = uri;
  // eslint-disable-next-line no-underscore-dangle
  global.__MONGOD__ = replSet;
};
