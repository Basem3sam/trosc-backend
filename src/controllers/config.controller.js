const trustedHosts = require('../utils/trustedHosts');
const catchAsync = require('../utils/catchAsync');

// #3.3/Q8: serves the EXACT array every URL validator in the app already
// checks against (src/utils/trustedHosts.js) — never a hand-copied or
// summarized version of it — so a form can warn about an untrusted host
// before the user submits, instead of only finding out from a 400.
exports.getTrustedHosts = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    results: trustedHosts.length,
    data: { trustedHosts },
  });
});
