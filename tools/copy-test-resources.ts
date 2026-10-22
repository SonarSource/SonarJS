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
import { cpSync, mkdirSync, statSync } from 'node:fs';
import { globSync } from 'glob';

const sourceBaseDir = path.join(import.meta.dirname, '..');
const patterns = [
  'packages/*/tests/**/fixtures/**/*',
  'packages/*/src/rules/**/*.fixture.*',
  'packages/*/src/rules/**/fixtures/**/*',
  'packages/*/src/rules/*/cb.options.json',
];

const filesToCopy = [
  path.join(sourceBaseDir, 'packages', 'jsts', 'src', 'rules', 'tsconfig.cb.json'),
];
filesToCopy.forEach(copyFileIntoLib);

function copyFileIntoLib(file: string) {
  const dest = path.join(
    sourceBaseDir,
    'lib',
    path.relative(path.join(sourceBaseDir, 'packages'), file),
  );
  if (statSync(file).isDirectory()) {
    mkdirSync(dest, { recursive: true });
  } else {
    mkdirSync(path.dirname(dest), { recursive: true });
    cpSync(file, dest);
  }
}

// Use glob to find all files recursively
console.log(patterns.join('\n'));
patterns.forEach(globPattern => {
  // using glob from npm, as the glob from node:fs, does not have the dot option
  const files = globSync(globPattern, { cwd: sourceBaseDir, absolute: true, dot: true });
  files.forEach(copyFileIntoLib);
});
