/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { readProjectPropertiesForJob } from './peach-project-properties.js';

test('readProjectPropertiesForJob suppresses git probe stderr for missing head-sha files', () => {
  const calls = [];

  const result = readProjectPropertiesForJob(
    '/tmp/peachee-js',
    'prepare-diff-val',
    '32a5ea7d0cc65d8c46e2b40ee51e6b12f6936aea',
    {
      execFileSync: (command, args, options) => {
        calls.push({ command, args, options });
        throw new Error('fatal: path does not exist');
      },
      existsSync: () => false,
      readFileSync: () => {
        throw new Error('readFileSync should not be used when headSha is provided');
      },
    },
  );

  assert.equal(result, undefined);
  assert.deepEqual(calls, [
    {
      command: 'git',
      args: [
        'show',
        '32a5ea7d0cc65d8c46e2b40ee51e6b12f6936aea:prepare-diff-val/sonar-project.properties',
      ],
      options: {
        cwd: '/tmp/peachee-js',
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    },
  ]);
});
