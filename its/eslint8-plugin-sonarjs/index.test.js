/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
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
