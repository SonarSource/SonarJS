import fs from 'node:fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'node:url';

const eslintPluginDependencies = [
  '@babel/core',
  '@babel/eslint-parser',
  '@babel/plugin-proposal-decorators',
  '@babel/preset-env',
  '@babel/preset-flow',
  '@babel/preset-react',
  '@eslint-community/regexpp',
  '@typescript-eslint/eslint-plugin',
  '@typescript-eslint/utils',
  'builtin-modules',
  'bytes',
  'eslint-plugin-import',
  'eslint-plugin-jsx-a11y',
  'eslint-plugin-react',
  'eslint-plugin-react-hooks',
  'eslint-scope',
  'functional-red-black-tree',
  'jsx-ast-utils',
  'minimatch',
  'scslre',
  'semver',
  'typescript',
  'vue-eslint-parser',
];

const mainPackageJson = JSON.parse(
  await fs.readFile(join(dirname(fileURLToPath(import.meta.url)), 'package.json'), 'utf8'),
);

const dependencies = {};

for (const [name, value] of Object.entries(mainPackageJson.dependencies)) {
  if (eslintPluginDependencies.includes(name)) {
    dependencies[name] = value;
  }
}

await fs.writeFile(
  join(dirname(fileURLToPath(import.meta.url)), 'lib', 'package.json'),
  JSON.stringify(
    {
      name: 'eslint-plugin-sonarjs',
      description: 'SonarJS rules for ESLint',
      version: '0.0.0-SNAPSHOT',
      main: './cjs/plugin.js',
      types: './types/plugin.d.ts',
      repository: {
        type: 'git',
        url: 'git+https://github.com/SonarSource/SonarJS.git',
      },
      author: 'SonarSource',
      license: 'LGPL-3.0-only',
      keywords: ['sonarjs', 'eslint', 'eslintplugin'],
      bugs: {
        url: 'https://community.sonarsource.com/',
      },
      homepage:
        'https://github.com/SonarSource/SonarJS/blob/master/packages/jsts/src/rules/README.md',
      dependencies,
      peerDependencies: {
        eslint: '^8.0.0 || ^9.0.0',
      },
    },
    null,
    2,
  ),
);
