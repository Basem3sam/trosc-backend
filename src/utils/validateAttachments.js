// src/utils/validateAttachments.js

// List of trusted file hosting services
const ALLOWED_HOSTS = require('./validateAttachments');

/**
 * Validates an array of attachment URLs.
 * Each URL must be HTTPS and from one of the allowed hosts.
 *
 * @param {Array} arr – array of URL strings (or undefined/null)
 * @returns {boolean} true if valid, false if any URL is invalid
 */
function validateAttachments(arr) {
  if (!arr || !arr.length) return true; // empty or undefined is allowed

  return arr.every((url) => {
    if (typeof url !== 'string') return false;

    try {
      const parsed = new URL(url);
      const isAllowedHost = ALLOWED_HOSTS.some((host) =>
        parsed.hostname.endsWith(host),
      );
      return isAllowedHost && parsed.protocol === 'https:';
    } catch {
      return false;
    }
  });
}

module.exports = validateAttachments;
