/**
 * 1. copy select dependencies from the root package.json to the packages/eslint-plugin-sonarjs/package.json
 * 2. copy engines property from the root package.json to the packages/eslint-plugin-sonarjs/package.json
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
const __dirname = import.meta.dirname;
import { default as rootPackageJson } from '../../package.json' assert { type: 'json' };
import { default as pluginPackageJson } from '../../packages/eslint-plugin-sonarjs/package.json' assert { type: 'json' };

const USED_DEPENDENCIES = new Set([
  'eslint',
  'eslint-plugin-import',
  'eslint-plugin-jsx-a11y',
  'eslint-plugin-react',
  'eslint-plugin-react-hooks',
  '@typescript-eslint/eslint-plugin',
  '@typescript-eslint/utils',
  'functional-red-black-tree',
  'bytes',
  'scslre',
]);

Object.keys(rootPackageJson.dependencies).map(dependency => {
  if (USED_DEPENDENCIES.has(dependency)) {
    pluginPackageJson.dependencies[dependency] = rootPackageJson.dependencies[dependency];
  }
});
pluginPackageJson.engines = rootPackageJson.engines;

fs.writeFileSync(
  path.join(__dirname, '..', '..', 'packages', 'eslint-plugin-sonarjs', 'package.json'),
  JSON.stringify(pluginPackageJson, null, 2),
);
