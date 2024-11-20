import path from 'node:path';
import fs from 'node:fs/promises';

const pathToJsTsRules = path.join(
  import.meta.dirname,
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
  import.meta.dirname,
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

const jsTsRules = await getJsonFiles(pathToJsTsRules);

const jsRules = jsTsRules.filter(rule => rule.default.compatibleLanguages.includes('JAVASCRIPT'));
const tsRules = jsTsRules.filter(rule => rule.default.compatibleLanguages.includes('TYPESCRIPT'));

const cssRules = await getJsonFiles(pathToCssRules);

console.log(`JS/TS rules: ${jsTsRules.length}`);
console.log(`JS rules: ${jsRules.length}`);
console.log(`TS rules: ${tsRules.length}`);
console.log(`CSS rules: ${cssRules.length}`);

async function getJsonFiles(pathToRules) {
  const filenames = await fs.readdir(pathToRules);
  return Promise.all(
    filenames
      .filter(filename => filename.endsWith('.json') && filename.length <= 'S1234.json'.length)
      .map(async file => await import(path.join(pathToRules, file), { assert: { type: 'json' } })),
  );
}
