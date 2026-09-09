/**
 * Escapes the five HTML-significant characters. Use this on any
 * user-supplied string before interpolating it into an HTML email body
 * or template — none of the data reaching here has been sanitized
 * upstream.
 */
function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (ch) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[ch],
  );
}

module.exports = escapeHtml;
