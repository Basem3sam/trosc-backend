/**
 * Polls `check` until it returns a truthy value, then resolves with it.
 * Use it for work the request deliberately does not wait for (audit rows,
 * background emails). Rejects with `message` if nothing turns up in time,
 * so a missing result still fails the test instead of hiding.
 *
 * @param {() => any | Promise<any>} check
 * @param {Object} [options]
 * @param {number} [options.timeoutMs=2000]
 * @param {number} [options.intervalMs=20]
 * @param {string} [options.message]
 */
async function waitFor(check, options = {}) {
  const {
    timeoutMs = 2000,
    intervalMs = 20,
    message = 'waitFor: condition not met in time',
  } = options;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    // Polling is sequential by design.
    // eslint-disable-next-line no-await-in-loop
    const result = await check();
    if (result) return result;
    if (Date.now() >= deadline) throw new Error(message);
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => {
      setTimeout(resolve, intervalMs);
    });
  }
}

module.exports = { waitFor };
