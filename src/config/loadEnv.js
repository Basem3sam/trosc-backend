// Loads the .env file that matches the current NODE_ENV, with a plain
// `.env` fallback for people who prefer a single file. Called from every
// process entry point BEFORE anything reads process.env:
//   - server.js
//   - testEmail.js
//   - scripts/createAdmin.js
//   - scripts/exportSwagger.js
//   - scripts/generateDashboardSnapshot.js
//
// Precedence (highest first):
//   1. env vars already set in the shell (Render/Vercel dashboard, `set X=`,
//      `$env:X =`, CI job env) — dotenv never overrides these.
//   2. .env.<NODE_ENV>
//   3. .env
//
// NODE_ENV itself must be set externally (shell, npm script via cross-env,
// or hosting dashboard). If it's unset, we default to 'development', which
// matches how server.js already behaves.

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..', '..');

module.exports = function loadEnv() {
  const env = process.env.NODE_ENV || 'development';
  const candidates = [`.env.${env}`, '.env'];

  const loaded = [];
  candidates.forEach((name) => {
    const full = path.join(ROOT, name);
    if (fs.existsSync(full)) {
      // dotenv.config() does NOT override vars that already exist in
      // process.env, so the first file we load wins over the second, and
      // real shell/dashboard vars win over both — exactly what we want.
      dotenv.config({ path: full });
      loaded.push(name);
    }
  });

  return loaded;
};
