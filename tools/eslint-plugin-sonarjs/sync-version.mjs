/**
 * 1. get version from packages/eslint-plugin-sonarjs/package.json
 * 2. update it in its/eslint-plugin-sonarjs/package.json
 * 3. update it in its/eslint-plugin-sonarjs/test/integration/test.sh
 * 4. update it in tools/eslint-plugin-sonarjs/build-to-its.sh
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
const __dirname = import.meta.dirname;
import { default as pluginPackageJson } from '../../packages/eslint-plugin-sonarjs/package.json' assert { type: 'json' };

const version = pluginPackageJson.version;
console.log(`Setting eslint-plugin-sonarjs version to ${version}`);

const TARGET_FILES = [
  path.join(__dirname, '..', '..', 'its', 'eslint-plugin-sonarjs', 'package.json'),
  path.join(
    __dirname,
    '..',
    '..',
    'its',
    'eslint-plugin-sonarjs',
    'test',
    'integration',
    'test.sh',
  ),
  path.join(__dirname, 'build-to-its.sh'),
];
TARGET_FILES.map(targetPath => replaceInPath(targetPath, version));

function replaceInPath(filePath, version) {
  console.log(`Updating version in ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf8');
  const updatedContent = replaceVersion(content, version);
  fs.writeFileSync(filePath, updatedContent);

  function replaceVersion(text, newVersion) {
    const regex = /eslint-plugin-sonarjs-(\d+\.\d+\.\d+)\.tgz/g;
    const replacement = `eslint-plugin-sonarjs-${newVersion}.tgz`;
    return text.replace(regex, replacement);
  }
}
