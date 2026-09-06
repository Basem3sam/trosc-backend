module.exports = async () => {
  // eslint-disable-next-line no-underscore-dangle
  const mongod = global.__MONGOD__;
  if (mongod) {
    await mongod.stop();
  }
};
