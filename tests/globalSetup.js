const dotenv = require('dotenv');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  // Load test-only env vars (JWT secret, rate-limit overrides, etc.)
  // BEFORE anything else touches process.env.
  dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

  // One real (but in-memory, throwaway) MongoDB instance for the whole
  // test run — no Docker, no shared dev database, no leftover data.
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  // Make the URI available to every test file, and stash the server
  // instance globally so globalTeardown.js can stop it afterwards.
  process.env.DATABASE_URL = uri;
  // eslint-disable-next-line no-underscore-dangle
  global.__MONGOD__ = mongod;
};
