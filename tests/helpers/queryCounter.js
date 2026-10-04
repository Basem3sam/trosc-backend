const mongoose = require('mongoose');

/**
 * Counts the MongoDB commands Mongoose issues, using its global `debug`
 * hook. Call `startQueryCount()` at the top of a test and `stop()` before
 * it ends (a `finally` block or `afterEach` is the safest place) - `stop()`
 * switches debug back off so the hook never leaks into another test.
 *
 * `collection` is the MongoDB collection name (`users`, `sessions`, ...)
 * and `method` is the driver method (`findOne`, `find`, ...). Note that
 * `Model.findById()` is recorded as `findOne`.
 *
 * @returns {{
 *   calls: Array<{ collection: string, method: string }>,
 *   count: (collection?: string, method?: string) => number,
 *   stop: () => Array<{ collection: string, method: string }>,
 * }}
 */
function startQueryCount() {
  const calls = [];

  mongoose.set('debug', (collection, method) => {
    calls.push({ collection, method });
  });

  return {
    calls,
    count: (collection, method) =>
      calls.filter(
        (c) =>
          (!collection || c.collection === collection) &&
          (!method || c.method === method),
      ).length,
    stop: () => {
      mongoose.set('debug', false);
      return calls;
    },
  };
}

module.exports = { startQueryCount };
