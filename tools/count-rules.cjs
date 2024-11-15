const url = require('node:url');
const path = require('node:path');
const fs = require('node:fs');

const pathToJsTsRules = path.join(
  __dirname,
  '..',
  'sonar-plugin',
  'javascript-checks',
  'src',
  'main',
  'resources',
  'org',
  'sonar',
  'l10n',
  'javascript',
  'rules',
  'javascript',
);
const pathToCssRules = path.join(
  __dirname,
  '..',
  'sonar-plugin',
  'css',
  'src',
  'main',
  'resources',
  'org',
  'sonar',
  'l10n',
  'css',
  'rules',
  'css',
);

const jsTsRules = getJsonFiles(pathToJsTsRules);

const jsRules = jsTsRules.filter(rule => rule.compatibleLanguages.includes('JAVASCRIPT'));
const tsRules = jsTsRules.filter(rule => rule.compatibleLanguages.includes('TYPESCRIPT'));

const cssRules = getJsonFiles(pathToCssRules);

console.log(`JS/TS rules: ${jsTsRules.length}`);
console.log(`JS rules: ${jsRules.length}`);
console.log(`TS rules: ${tsRules.length}`);
console.log(`CSS rules: ${cssRules.length}`);

function getJsonFiles(pathToRules) {
  const filenames = fs.readdirSync(pathToRules);
  return filenames
    .filter(filename => filename.endsWith('.json') && filename.length <= 'S1234.json'.length)
    .map(file => require(path.join(pathToRules, file)));
}
