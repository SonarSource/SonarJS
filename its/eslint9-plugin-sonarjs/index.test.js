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
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const spawn = require('cross-spawn');

const fixturesDir = 'fixtures';

function verifyErrors(output) {
  console.log(output);
  const errorLines = output.split('\n').filter(line => line.includes('error'));
  assert(errorLines.length >= 8);
}

test('should work with CommonJS config', async t => {
  const result = spawn.sync(
    'npx',
    ['eslint', '-c', 'eslint.config.cjs', path.join(fixturesDir, 'file.js')],
    {
      cwd: __dirname,
      encoding: 'utf-8',
    },
  );
  verifyErrors(result.stdout);
});

test('should work with ECMAScript modules config', async t => {
  const result = spawn.sync(
    'npx',
    ['eslint', '-c', 'eslint.config.mjs', path.join(fixturesDir, 'file.js')],
    {
      cwd: __dirname,
      encoding: 'utf-8',
    },
  );
  verifyErrors(result.stdout);
});

test('should work with TSESLint config', async t => {
  const result = spawn.sync(
    'npx',
    ['eslint', '-c', 'tseslint.config.mjs', path.join(fixturesDir, 'file.ts')],
    {
      cwd: __dirname,
      encoding: 'utf-8',
    },
  );
  verifyErrors(result.stdout);
});
