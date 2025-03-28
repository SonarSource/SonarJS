import path from 'path';
import { cpSync, mkdirSync, statSync, accessSync } from 'node:fs';
import { globSync } from 'glob';

// Define the source and destination directories
const sourceBaseDir = path.join(import.meta.dirname, '..');
const patterns = [
  'packages/*/tests/**/fixtures/**/*',
  'packages/*/src/rules/**/*.fixture.*',
  'packages/*/src/rules/**/fixtures/**/*',
  'packages/*/src/rules/*/cb.options.json',
];

const filesToCopy = [
  path.join(import.meta.dirname, '..', 'packages', 'jsts', 'src', 'rules', 'tsconfig.cb.json'),
];
filesToCopy.forEach(copyFileIntoLib);

function copyFileIntoLib(file: string) {
  const dest = file.replace('/packages/', '/lib/');
  if (statSync(file).isDirectory()) {
    try {
      accessSync(dest);
    } catch (e) {
      mkdirSync(dest, { recursive: true });
    }
  } else {
    cpSync(file, dest);
  }
}

// Use glob to find all files recursively
const globs = patterns.map(pattern => path.join(sourceBaseDir, pattern));
console.log(globs.join('\n'));
globs.forEach(globPattern => {
  // using glob from npm, as the glob from node:fs, does not have the dot option
  const files = globSync(globPattern, { dot: true });
  files.forEach(copyFileIntoLib);
});
