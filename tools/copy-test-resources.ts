/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import path from 'path';
import { cpSync, mkdirSync, statSync, accessSync } from 'node:fs';
import { globSync } from 'glob';
import { toUnixPath } from './helpers.js';

const sourceBaseDir = path.join(import.meta.dirname, '..');
const patterns = [
  'packages/*/tests/**/fixtures/**/*',
  'packages/*/tests/**/fixtures-*/**/*',
  'packages/*/src/rules/**/*.fixture.*',
  'packages/*/src/rules/**/fixtures/**/*',
  'packages/*/src/rules/*/cb.options.json',
];

const filesToCopy = [
  path.join(sourceBaseDir, 'packages', 'jsts', 'src', 'rules', 'tsconfig.cb.json'),
];
filesToCopy.map(toUnixPath).forEach(copyFileIntoLib);

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
const globs = patterns.map(pattern => toUnixPath(path.join(sourceBaseDir, pattern)));
console.log(globs.join('\n'));
globs.forEach(globPattern => {
  // using glob from npm, as the glob from node:fs, does not have the dot option
  const files = globSync(globPattern, { dot: true });
  files.map(toUnixPath).forEach(copyFileIntoLib);
});
