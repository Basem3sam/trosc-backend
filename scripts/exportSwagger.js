require('dotenv').config();
const fs = require('fs');
const path = require('path');
const spec = require('../src/config/swagger.config');

fs.writeFileSync(
  path.join(__dirname, '../swagger.json'),
  JSON.stringify(spec, null, 2),
);
console.log('✅ swagger.json exported');