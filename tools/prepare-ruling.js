const path = require('path');
const fs = require('fs');

const TARGET = path.join(__dirname, '..', 'its', 'sources');
const LINK = path.join(__dirname, '..', '..', 'sonarjs-ruling-sources');

if (fs.existsSync(LINK)) {
  fs.unlinkSync(LINK);
}
fs.symlinkSync(TARGET, LINK);
