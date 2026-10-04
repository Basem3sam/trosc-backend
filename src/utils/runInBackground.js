const { logger } = require('./logger');

/**
 * Starts `task` right away but does NOT make the caller wait for it. Use
 * it for work the response does not depend on (confirmation emails), so a
 * slow or failing provider cannot delay or fail the request.
 *
 * Any failure (a rejected promise or a synchronous throw) is logged with
 * `label` and the safe identifiers in `context` (an id, never an email
 * address, body or token). Nothing is thrown back to the caller.
 *
 * The work is lost if the process exits before it finishes. That is
 * acceptable for confirmations; anything that must be delivered needs a
 * durable queue instead (PLAN 5.2).
 *
 * @param {string} label - what was being done, e.g. 'Welcome email'
 * @param {Object} context - safe identifiers to log, e.g. { userId }
 * @param {() => any} task - starts the work; may return a promise
 */
const runInBackground = (label, context, task) => {
  const onError = (err) => {
    logger.error(`${label} failed`, { ...context, error: err?.message });
  };

  try {
    // Promise.resolve() also accepts a task that returns nothing.
    Promise.resolve(task()).catch(onError);
  } catch (err) {
    onError(err);
  }
};

module.exports = runInBackground;
