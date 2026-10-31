const { readFileSync } = require('node:fs');
const path = require('node:path');

// Shared by runtime resolution and bundling. Aliases are identified by their
// package identity, including local checkouts outside node_modules.
const compilerEntry =
  /^(?:typescript(?:-classic|-native)?|@typescript\/(?:native-preview|api))(?:\/|$)/;
const supportedRoot =
  /^(?:typescript|typescript-classic)(?:\/lib\/(?:typescript|tsserverlibrary)(?:\.js)?)?$/;
const metadataEntry = /^(?:typescript|typescript-classic)\/package\.json$/;
const controlEntries = new Set(['typescript/control', 'typescript/errors']);
const compilerPackageNames = new Set([
  'typescript',
  '@typescript/native-preview',
  '@typescript/api',
]);

function getImplementationRoots(ownedRoot, classicRoot) {
  return [
    ownedRoot,
    classicRoot,
    path.resolve(ownedRoot, '../analysis/src/jsts/native'),
    path.resolve(ownedRoot, '../../lib/analysis/src/jsts/native'),
  ];
}

function findCompilerRoot(file, cache, ownedRoot) {
  let directory = path.dirname(file);
  const traversed = [];
  let result;
  while (path.dirname(directory) !== directory) {
    if (cache.has(directory)) {
      result = cache.get(directory);
      break;
    }
    traversed.push(directory);
    let manifest;
    try {
      manifest = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
    }
    if (manifest?.name) {
      if (directory !== ownedRoot && compilerPackageNames.has(manifest.name)) result = directory;
      break;
    }
    directory = path.dirname(directory);
  }
  for (const directory of traversed) cache.set(directory, result);
  return result;
}

module.exports = {
  compilerEntry,
  supportedRoot,
  metadataEntry,
  controlEntries,
  findCompilerRoot,
  getImplementationRoots,
};
