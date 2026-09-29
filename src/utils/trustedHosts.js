// src/utils/trustedHosts.js
//
// SINGLE SOURCE OF TRUTH for every "attachment/resource/session URL must
// be from a trusted host" check in the app (BACKEND-REQUESTS-2 #3.3 / Q8).
// Every validator (Mongoose or Joi) imports isTrustedHost.js, which reads
// this list — never hardcode a second copy of these hostnames anywhere.
// `GET /v1/config/trusted-hosts` (src/controllers/config.controller.js)
// also serves this exact array, so the frontend, the validation error
// messages, and the docs can never drift from what's actually enforced.
//
// isTrustedHost.js treats each entry as also matching its subdomains
// (e.g. "youtube.com" already matches "www.youtube.com" and
// "m.youtube.com"), so those two aren't listed separately below — they're
// covered for free. `youtu.be` and `youtube-nocookie.com` are separate
// second-level domains YouTube also serves from, so they're listed
// explicitly.
module.exports = [
  'youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'drive.google.com',
  'docs.google.com',
  'dropbox.com',
  'dl.dropboxusercontent.com',
  'github.com',
  'raw.githubusercontent.com',
  'res.cloudinary.com',
  'i.imgur.com',
  'imgur.com',
  'cdn.discordapp.com',
  'media.discordapp.net',
];
