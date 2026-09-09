const ALLOWED_HOSTS = require('./trustedHosts');

/**
 * True only if `hostname` IS one of the trusted hosts, or a genuine
 * subdomain of one (e.g. "sub.github.com" passes for "github.com").
 *
 * Deliberately NOT `hostname.endsWith(host)` — that also matches any
 * domain that merely ends with the trusted string as a substring, e.g.
 * "evilgithub.com".endsWith("github.com") === true, even though the
 * attacker doesn't own github.com at all.
 */
function isTrustedHost(hostname) {
  return ALLOWED_HOSTS.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`),
  );
}

module.exports = isTrustedHost;
