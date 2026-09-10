const dotenv = require('dotenv');
const path = require('path');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

module.exports = async () => {
  // Load test-only env vars (JWT secret, rate-limit overrides, etc.)
  dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
  process.env.JWT_SECRET =
    process.env.JWT_SECRET || 'test_jwt_secret_at_least_32_characters_long';
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

  process.env.JWT_SECRET =
    process.env.JWT_SECRET || 'test_jwt_secret_at_least_32_characters_long';
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

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
