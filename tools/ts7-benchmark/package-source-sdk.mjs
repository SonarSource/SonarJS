import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const [repository, destination, expectedRevision, label] = process.argv.slice(2);
assert(
  repository && destination && expectedRevision && label,
  'Expected repo, destination, revision, label',
);
const revision = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: repository,
  encoding: 'utf8',
}).trim();
assert.equal(revision, expectedRevision);
assert(!fs.existsSync(destination), 'Refusing to overwrite SDK snapshot');
const source = path.join(repository, 'packages/typescript');
const local = path.join(repository, 'built/local');
const manifest = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8'));
assert.equal(manifest.name, '@typescript/typescript');
assert(fs.existsSync(path.join(source, 'dist/api/sync/api.js')), 'Build JS SDK first');
assert(fs.existsSync(path.join(local, 'tsc.exe')), 'Build Windows compiler first');
fs.mkdirSync(destination, { recursive: true });
for (const directory of ['dist', 'vendor', 'lib', 'schemas', 'bin']) {
  if (fs.existsSync(path.join(source, directory))) {
    fs.cpSync(path.join(source, directory), path.join(destination, directory), { recursive: true });
  }
}
manifest.version = `7.1.0-pr64823.${label}-${revision.slice(0, 12)}`;
manifest.gitHead = revision;
manifest.sonarjsSourceBuild = { repository: path.resolve(repository), revision, label };
fs.writeFileSync(path.join(destination, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.copyFileSync(path.join(local, 'tsc.exe'), path.join(destination, 'lib/tsc.exe'));
const libraries = fs.readdirSync(local).filter(file => /^lib(?:\..*)?\.d\.ts$/.test(file));
assert(libraries.length > 0, 'Expected compiler libraries in built/local');
assert(libraries.includes('lib.d.ts'), 'Expected default compiler library');
for (const file of libraries) {
  fs.copyFileSync(path.join(local, file), path.join(destination, 'lib', file));
}
// The test distribution is self-contained, rather than resolving the nightly's
// platform package or a mutable compiler in the upstream checkout.
fs.writeFileSync(
  path.join(destination, 'lib/getExePath.js'),
  "import { fileURLToPath } from 'node:url';\nexport default () => fileURLToPath(new URL('./tsc.exe', import.meta.url));\n",
);
console.log(
  JSON.stringify({ destination: path.resolve(destination), revision, libraries: libraries.length }),
);
