const path = require('path');
const fs = require('fs');
const semver = require('semver');

const version = process.versions.node;
if (semver.lt(version, '20.10.0')) {
  console.error('Node.js 20.10.0 or higher is required');
  process.exit(1);
}

const missing = findMissingData();
if (missing.length > 0) {
  console.error(`Missing ${missing} files`);
  console.error(
    'Please run "npm run update-ruling-data" before running "npm run ruling". You can also run "npm run build" or "npm run build:fast"',
  );
  process.exit(1);
}

const TARGET = path.join(__dirname, '..', 'its', 'sources');
const LINK = path.join(__dirname, '..', '..', 'sonarjs-ruling-sources');

if (fs.existsSync(LINK)) {
  fs.unlinkSync(LINK);
}
fs.symlinkSync(TARGET, LINK);

function findMissingData() {
  const PATH_TO_MAPPING = path.join(
    __dirname,
    '..',
    'packages',
    'ruling',
    'tests',
    'data',
    'eslint-to-sonar-id.json',
  );
  const PATH_TO_RULES = path.join(
    __dirname,
    '..',
    'packages',
    'ruling',
    'tests',
    'data',
    'rules.json',
  );
  const missing = [];
  if (!fs.existsSync(PATH_TO_MAPPING)) {
    missing.push(PATH_TO_MAPPING);
  }
  if (!fs.existsSync(PATH_TO_RULES)) {
    missing.push(PATH_TO_RULES);
  }
  return missing;
}
