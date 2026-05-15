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

import { collectRunJobs } from './peach-run-jobs.js';

function parseOutputJson(output, filePath) {
  const content = output[filePath];
  assert.notEqual(content, undefined, `missing output for ${filePath}`);
  return JSON.parse(content);
}

test('collectRunJobs writes merged and derived job files from paginated gh api output', async () => {
  const output = {};
  const mkdirCalls = [];
  const execCalls = [];

  await collectRunJobs(
    {
      runId: '25710841728',
      outputDir: '/tmp/peach-target',
    },
    {
      execFileSync: (command, args) => {
        execCalls.push([command, ...args]);
        assert.equal(command, 'gh');
        assert.deepEqual(args, [
          'api',
          'repos/SonarSource/peachee-js/actions/runs/25710841728/jobs?per_page=100',
          '--paginate',
          '--slurp',
        ]);

        return JSON.stringify([
          {
            total_count: 4,
            jobs: [
              { name: 'prepare-project-matrix', conclusion: 'success' },
              { name: 'project-a', conclusion: 'failure' },
              { name: 'project-b', conclusion: 'success' },
            ],
          },
          {
            total_count: 4,
            jobs: [{ name: 'diff-validation-aggregated', conclusion: 'failure' }],
          },
        ]);
      },
      mkdirSync: (dirPath, options) => {
        mkdirCalls.push([dirPath, options]);
      },
      writeFileSync: (filePath, content) => {
        output[filePath] = content;
      },
    },
  );

  assert.deepEqual(execCalls, [
    [
      'gh',
      'api',
      'repos/SonarSource/peachee-js/actions/runs/25710841728/jobs?per_page=100',
      '--paginate',
      '--slurp',
    ],
  ]);
  assert.deepEqual(mkdirCalls, [['/tmp/peach-target', { recursive: true }]]);

  assert.deepEqual(parseOutputJson(output, '/tmp/peach-target/jobs-merged.json'), {
    expected_total: 4,
    total_jobs: 4,
    failed_jobs: 2,
    counts_match: true,
    jobs: [
      { name: 'prepare-project-matrix', conclusion: 'success' },
      { name: 'project-a', conclusion: 'failure' },
      { name: 'project-b', conclusion: 'success' },
      { name: 'diff-validation-aggregated', conclusion: 'failure' },
    ],
  });

  assert.deepEqual(parseOutputJson(output, '/tmp/peach-target/analyzed-jobs.json'), {
    total_jobs: 2,
    jobs: [
      { name: 'project-a', conclusion: 'failure' },
      { name: 'project-b', conclusion: 'success' },
    ],
  });

  assert.deepEqual(parseOutputJson(output, '/tmp/peach-target/exclusion-counts.json'), {
    excluded_workflow_jobs: 2,
    excluded_project_jobs: 0,
  });

  assert.deepEqual(parseOutputJson(output, '/tmp/peach-target/failed-jobs.json'), {
    total_jobs: 1,
    jobs: [{ name: 'project-a', conclusion: 'failure' }],
  });

  assert.deepEqual(parseOutputJson(output, '/tmp/peach-target/project-jobs.json'), {
    total_jobs: 1,
    jobs: [{ name: 'project-b', conclusion: 'success' }],
  });
});

test('collectRunJobs falls back to explicit page fetches when the paginated total is short', async () => {
  const output = {};
  const execCalls = [];

  await collectRunJobs(
    {
      runId: '25710841728',
      outputDir: '/tmp/peach-target',
      pageSize: 2,
    },
    {
      execFileSync: (command, args) => {
        execCalls.push([command, ...args]);
        assert.equal(command, 'gh');

        const endpoint = args[1];
        if (args.includes('--slurp')) {
          return JSON.stringify([
            {
              total_count: 3,
              jobs: [
                { name: 'project-a', conclusion: 'success' },
                { name: 'project-b', conclusion: 'failure' },
              ],
            },
          ]);
        }

        if (endpoint.endsWith('&page=1')) {
          return JSON.stringify({
            total_count: 3,
            jobs: [
              { name: 'project-a', conclusion: 'success' },
              { name: 'project-b', conclusion: 'failure' },
            ],
          });
        }

        if (endpoint.endsWith('&page=2')) {
          return JSON.stringify({
            total_count: 3,
            jobs: [{ name: 'project-c', conclusion: 'success' }],
          });
        }

        throw new Error(`unexpected args: ${args.join(' ')}`);
      },
      mkdirSync: () => {},
      writeFileSync: (filePath, content) => {
        output[filePath] = content;
      },
    },
  );

  assert.deepEqual(execCalls, [
    [
      'gh',
      'api',
      'repos/SonarSource/peachee-js/actions/runs/25710841728/jobs?per_page=2',
      '--paginate',
      '--slurp',
    ],
    [
      'gh',
      'api',
      'repos/SonarSource/peachee-js/actions/runs/25710841728/jobs?per_page=2&page=1',
    ],
    [
      'gh',
      'api',
      'repos/SonarSource/peachee-js/actions/runs/25710841728/jobs?per_page=2&page=2',
    ],
  ]);

  assert.deepEqual(parseOutputJson(output, '/tmp/peach-target/jobs-merged.json'), {
    expected_total: 3,
    total_jobs: 3,
    failed_jobs: 1,
    counts_match: true,
    jobs: [
      { name: 'project-a', conclusion: 'success' },
      { name: 'project-b', conclusion: 'failure' },
      { name: 'project-c', conclusion: 'success' },
    ],
  });
});
