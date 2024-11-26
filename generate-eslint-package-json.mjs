/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import fs from 'node:fs/promises';
import { dirname, join } from 'path';
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
let missingDependencies = Array.from(eslintPluginDependencies);

for (const [name, value] of Object.entries(mainPackageJson.dependencies).concat(
  Object.entries(mainPackageJson.devDependencies),
)) {
  if (eslintPluginDependencies.includes(name)) {
    dependencies[name] = value;
    const i = missingDependencies.indexOf(name);
    missingDependencies.splice(i, 1);
  }
}

if (missingDependencies.length > 0) {
  throw new Error(
    `Some dependencies of the ESLint plugin were not found in the package.json: ${missingDependencies.toString()}`,
  );
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
        eslint: '8.0.0 - 9.14',
      },
    },
    null,
    2,
  ),
);
