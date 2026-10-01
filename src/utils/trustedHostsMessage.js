// src/utils/trustedHostsMessage.js
//
// Builds the "must be from a trusted host" validation message from the ONE
// real allowlist (src/utils/trustedHosts.js) so the error text a user sees
// can never drift from what is actually enforced (BACKEND-REQUESTS-2 #3.1 /
// #3.3). Before this, each validator hand-typed its own abbreviated host
// list in its message (and several omitted hosts such as Discord's CDN).
//
// Every Joi and Mongoose URL validator should use trustedHostMessage()
// instead of writing its own copy of the sentence.
const TRUSTED_HOSTS = require('./trustedHosts');

// Computed once at load time - the list is a static module constant.
const TRUSTED_HOSTS_LIST = TRUSTED_HOSTS.join(', ');

/**
 * @param {string} subject - what is being validated, e.g. "Attachment"
 * @returns {string} e.g. "Attachment must be a valid HTTPS URL from a
 *   trusted host (youtube.com, ..., and their subdomains) - see GET
 *   /v1/config/trusted-hosts"
 */
function trustedHostMessage(subject) {
  return `${subject} must be a valid HTTPS URL from a trusted host (${TRUSTED_HOSTS_LIST}, and their subdomains) — see GET /v1/config/trusted-hosts`;
}

module.exports = { trustedHostMessage, TRUSTED_HOSTS_LIST };
