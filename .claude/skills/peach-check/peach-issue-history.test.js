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

import { runIssueHistory } from './peach-issue-history.js';

function createGitExecFileSyncStub(headSha, files) {
  return (command, args) => {
    assert.equal(command, 'git');

    if (args[0] === 'rev-parse') {
      assert.equal(args[3], `${headSha}^{commit}`);
      return `${headSha}\n`;
    }

    if (args[0] === 'show') {
      const filePath = args[1].slice(`${headSha}:`.length);
      const content = files[filePath];
      if (content === undefined) {
        throw new Error(`missing file: ${filePath}`);
      }
      return content;
    }

    throw new Error(`unexpected git invocation: ${args.join(' ')}`);
  };
}

function createFetchResponse(payload) {
  return {
    status: 200,
    headers: {
      get: () => null,
    },
    json: async () => payload,
  };
}

function createErrorFetchResponse(status, body = 'temporary failure') {
  return {
    status,
    headers: {
      get: () => null,
    },
    text: async () => body,
  };
}

async function runSingleProjectIssueHistory({
  baselineValues,
  currentValue,
  headSha,
  projectKey,
  projectName,
  thresholdPct = 5,
  thresholdAbs = 20,
}) {
  const output = {};

  await runIssueHistory(
    {
      jobsJsonPath: '/tmp/project-jobs.json',
      peacheeRoot: '/tmp/peachee-js',
      outputPath: '/tmp/peach-issue-history.json',
      apiToken: 'test-token',
      thresholdPct,
      thresholdAbs,
    },
    {
      readFileSync: filePath => {
        assert.equal(filePath, '/tmp/project-jobs.json');
        return JSON.stringify({
          total_jobs: 1,
          jobs: [
            {
              name: projectName,
              conclusion: 'success',
              head_sha: headSha,
              started_at: '2026-05-01T08:10:46Z',
              completed_at: '2026-05-01T08:16:08Z',
            },
          ],
        });
      },
      writeFileSync: (filePath, content) => {
        output[filePath] = content;
      },
      existsSync: filePath => {
        assert.equal(filePath, `/tmp/peachee-js/${projectName}/sonar-project.properties`);
        return true;
      },
      execFileSync: createGitExecFileSyncStub(headSha, {
        [`${projectName}/sonar-project.properties`]: `sonar.projectKey=${projectKey}\n`,
      }),
      fetchMeasureHistory: async requestedProjectKey => {
        assert.equal(requestedProjectKey, projectKey);
        return [
          ...baselineValues.map((value, index) => ({
            date: `2026-04-${String(index + 26).padStart(2, '0')}T03:10:35Z`,
            value,
          })),
          { date: '2026-05-01T08:15:00Z', value: currentValue },
        ];
      },
      sleep: async () => {},
      random: () => 0,
    },
  );

  return JSON.parse(output['/tmp/peach-issue-history.json']);
}

test('runIssueHistory uses snake_case job metadata and ignores later stale zeroes', async () => {
  const headSha = '2222222222222222222222222222222222222222';
  const output = {};

  await runIssueHistory(
    {
      jobsJsonPath: '/tmp/project-jobs.json',
      peacheeRoot: '/tmp/peachee-js',
      outputPath: '/tmp/peach-issue-history.json',
      apiToken: 'test-token',
    },
    {
      readFileSync: (filePath) => {
        assert.equal(filePath, '/tmp/project-jobs.json');
        return JSON.stringify({
          total_jobs: 1,
          jobs: [
            {
              name: 'ant-design',
              conclusion: 'success',
              head_sha: headSha,
              started_at: '2026-05-01T08:10:46Z',
              completed_at: '2026-05-01T08:16:08Z',
            },
          ],
        });
      },
      writeFileSync: (filePath, content) => {
        output[filePath] = content;
      },
      existsSync: (filePath) => {
        assert.equal(filePath, '/tmp/peachee-js/ant-design/sonar-project.properties');
        return true;
      },
      execFileSync: createGitExecFileSyncStub(headSha, {
        'ant-design/sonar-project.properties': 'sonar.projectKey=js:CommittedProject\n',
      }),
      fetchMeasureHistory: async (projectKey) => {
        assert.equal(projectKey, 'js:CommittedProject');
        return [
          { date: '2026-04-26T03:10:35Z', value: 25000 },
          { date: '2026-04-27T03:10:35Z', value: 25020 },
          { date: '2026-04-28T03:10:35Z', value: 25040 },
          { date: '2026-04-29T03:10:35Z', value: 25060 },
          { date: '2026-04-30T03:10:35Z', value: 25080 },
          { date: '2026-05-01T08:15:00Z', value: 24940 },
          { date: '2026-05-02T03:10:35Z', value: 0 },
        ];
      },
      sleep: async () => {},
      random: () => 0,
    },
  );

  const report = JSON.parse(output['/tmp/peach-issue-history.json']);
  assert.equal(report.analysis_after, '2026-04-30T00:00:00Z');
  assert.equal(report.analysis_before, '2026-05-01T08:16:08Z');
  assert.deepEqual(report.summary, { OK: 1 });

  const row = report.rows[0];
  assert.equal(row.project_key, 'js:CommittedProject');
  assert.equal(row.status, 'OK');
  assert.equal(row.analysis_date, '2026-05-01T08:15:00Z');
  assert.equal(row.current_value, 24940);
  assert.equal(row.baseline_value, 25040);
});

test('runIssueHistory keeps high-percentage drops OK below the absolute noise floor', async () => {
  const report = await runSingleProjectIssueHistory({
    baselineValues: [10, 10, 10, 10, 10],
    currentValue: 9,
    headSha: '4444444444444444444444444444444444444444',
    projectKey: 'js:SmallProject',
    projectName: 'small-project',
    thresholdPct: 5,
    thresholdAbs: 2,
  });

  assert.deepEqual(report.summary, { OK: 1 });

  const row = report.rows[0];
  assert.equal(row.status, 'OK');
  assert.equal(row.baseline_value, 10);
  assert.equal(row.current_value, 9);
  assert.equal(row.drop_abs, 1);
  assert.equal(row.drop_pct, 10);
});

test('runIssueHistory keeps drops OK when only the absolute threshold is exceeded', async () => {
  const report = await runSingleProjectIssueHistory({
    baselineValues: [100, 100, 100, 100, 100],
    currentValue: 79,
    headSha: '6666666666666666666666666666666666666666',
    projectKey: 'js:LargeProject',
    projectName: 'large-project',
    thresholdPct: 25,
    thresholdAbs: 20,
  });

  assert.deepEqual(report.summary, { OK: 1 });

  const row = report.rows[0];
  assert.equal(row.status, 'OK');
  assert.equal(row.baseline_value, 100);
  assert.equal(row.current_value, 79);
  assert.equal(row.drop_abs, 21);
  assert.equal(row.drop_pct, 21);
});

test('runIssueHistory marks DROP when both drop thresholds are exceeded', async () => {
  const report = await runSingleProjectIssueHistory({
    baselineValues: [10, 10, 10, 10, 10],
    currentValue: 7,
    headSha: '5555555555555555555555555555555555555555',
    projectKey: 'js:DropProject',
    projectName: 'drop-project',
    thresholdPct: 5,
    thresholdAbs: 2,
  });

  assert.deepEqual(report.summary, { DROP: 1 });

  const row = report.rows[0];
  assert.equal(row.status, 'DROP');
  assert.equal(row.baseline_value, 10);
  assert.equal(row.current_value, 7);
  assert.equal(row.drop_abs, 3);
  assert.equal(row.drop_pct, 30);
});

test('runIssueHistory reads the newest history page for long-lived projects', async t => {
  const headSha = '3333333333333333333333333333333333333333';
  const output = {};
  const requestedPages = [];
  const originalFetch = globalThis.fetch;
  const historyStart = Date.UTC(2025, 11, 26, 3, 0, 0);
  const history = Array.from({ length: 131 }, (_, index) => ({
    date: new Date(historyStart + index * 24 * 60 * 60 * 1000).toISOString(),
    value: '1000',
  }));

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async url => {
    const parsedUrl = new URL(url);
    assert.equal(parsedUrl.hostname, 'peach.sonarsource.com');
    assert.equal(parsedUrl.pathname, '/api/measures/search_history');
    assert.equal(parsedUrl.searchParams.get('component'), 'js:LongLivedProject');
    assert.equal(parsedUrl.searchParams.get('metrics'), 'violations');

    const pageIndex = Number(parsedUrl.searchParams.get('p') ?? '1');
    const pageSize = Number(parsedUrl.searchParams.get('ps') ?? '100');
    const start = (pageIndex - 1) * pageSize;
    requestedPages.push(pageIndex);

    return createFetchResponse({
      paging: {
        pageIndex,
        pageSize,
        total: history.length,
      },
      measures: [
        {
          metric: 'violations',
          history: history.slice(start, start + pageSize),
        },
      ],
    });
  };

  await runIssueHistory(
    {
      jobsJsonPath: '/tmp/project-jobs.json',
      peacheeRoot: '/tmp/peachee-js',
      outputPath: '/tmp/peach-issue-history.json',
      apiToken: 'test-token',
    },
    {
      readFileSync: filePath => {
        assert.equal(filePath, '/tmp/project-jobs.json');
        return JSON.stringify({
          total_jobs: 1,
          jobs: [
            {
              name: 'long-lived-project',
              conclusion: 'success',
              head_sha: headSha,
              started_at: '2026-05-05T03:10:46Z',
              completed_at: '2026-05-05T03:16:08Z',
            },
          ],
        });
      },
      writeFileSync: (filePath, content) => {
        output[filePath] = content;
      },
      existsSync: filePath => {
        assert.equal(filePath, '/tmp/peachee-js/long-lived-project/sonar-project.properties');
        return true;
      },
      execFileSync: createGitExecFileSyncStub(headSha, {
        'long-lived-project/sonar-project.properties': 'sonar.projectKey=js:LongLivedProject\n',
      }),
      sleep: async () => {},
      random: () => 0,
    },
  );

  assert.deepEqual(requestedPages, [1, 2]);

  const report = JSON.parse(output['/tmp/peach-issue-history.json']);
  assert.deepEqual(report.summary, { OK: 1 });

  const row = report.rows[0];
  assert.equal(row.project_key, 'js:LongLivedProject');
  assert.equal(row.status, 'OK');
  assert.equal(row.analysis_date, '2026-05-05T03:00:00.000Z');
  assert.equal(row.current_value, 1000);
  assert.equal(row.baseline_value, 1000);
});

test('runIssueHistory computes the baseline across three history pages', async t => {
  const headSha = '7777777777777777777777777777777777777777';
  const output = {};
  const requestedPages = [];
  const originalFetch = globalThis.fetch;
  const endTimestamp = Date.UTC(2026, 4, 5, 3, 0, 0);
  const history = Array.from({ length: 203 }, (_, index) => ({
    date: new Date(endTimestamp - (202 - index) * 24 * 60 * 60 * 1000).toISOString(),
    value: String(index + 1),
  }));

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async url => {
    const parsedUrl = new URL(url);
    assert.equal(parsedUrl.hostname, 'peach.sonarsource.com');
    assert.equal(parsedUrl.pathname, '/api/measures/search_history');
    assert.equal(parsedUrl.searchParams.get('component'), 'js:ThreePageProject');
    assert.equal(parsedUrl.searchParams.get('metrics'), 'violations');

    const pageIndex = Number(parsedUrl.searchParams.get('p') ?? '1');
    const pageSize = Number(parsedUrl.searchParams.get('ps') ?? '100');
    const start = (pageIndex - 1) * pageSize;
    requestedPages.push(pageIndex);

    return createFetchResponse({
      paging: {
        pageIndex,
        pageSize,
        total: history.length,
      },
      measures: [
        {
          metric: 'violations',
          history: history.slice(start, start + pageSize),
        },
      ],
    });
  };

  await runIssueHistory(
    {
      jobsJsonPath: '/tmp/project-jobs.json',
      peacheeRoot: '/tmp/peachee-js',
      outputPath: '/tmp/peach-issue-history.json',
      apiToken: 'test-token',
    },
    {
      readFileSync: filePath => {
        assert.equal(filePath, '/tmp/project-jobs.json');
        return JSON.stringify({
          total_jobs: 1,
          jobs: [
            {
              name: 'three-page-project',
              conclusion: 'success',
              head_sha: headSha,
              started_at: '2026-05-05T03:10:46Z',
              completed_at: '2026-05-05T03:16:08Z',
            },
          ],
        });
      },
      writeFileSync: (filePath, content) => {
        output[filePath] = content;
      },
      existsSync: filePath => {
        assert.equal(filePath, '/tmp/peachee-js/three-page-project/sonar-project.properties');
        return true;
      },
      execFileSync: createGitExecFileSyncStub(headSha, {
        'three-page-project/sonar-project.properties': 'sonar.projectKey=js:ThreePageProject\n',
      }),
      sleep: async () => {},
      random: () => 0,
    },
  );

  assert.deepEqual(requestedPages, [1, 2, 3]);

  const report = JSON.parse(output['/tmp/peach-issue-history.json']);
  assert.deepEqual(report.summary, { OK: 1 });

  const row = report.rows[0];
  assert.equal(row.project_key, 'js:ThreePageProject');
  assert.equal(row.status, 'OK');
  assert.equal(row.analysis_date, '2026-05-05T03:00:00.000Z');
  assert.equal(row.current_value, 203);
  assert.equal(row.baseline_value, 200);
});

test('runIssueHistory keeps enough three-page history when later analyses are outside the freshness window', async t => {
  const headSha = '9999999999999999999999999999999999999999';
  const output = {};
  const requestedPages = [];
  const originalFetch = globalThis.fetch;
  const endTimestamp = Date.UTC(2026, 4, 5, 3, 0, 0);
  const history = Array.from({ length: 203 }, (_, index) => ({
    date: new Date(endTimestamp - (202 - index) * 24 * 60 * 60 * 1000).toISOString(),
    value: String(index + 1),
  }));
  const currentEntry = history[102];

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async url => {
    const parsedUrl = new URL(url);
    assert.equal(parsedUrl.hostname, 'peach.sonarsource.com');
    assert.equal(parsedUrl.pathname, '/api/measures/search_history');
    assert.equal(parsedUrl.searchParams.get('component'), 'js:ThreePageProject');
    assert.equal(parsedUrl.searchParams.get('metrics'), 'violations');

    const pageIndex = Number(parsedUrl.searchParams.get('p') ?? '1');
    const pageSize = Number(parsedUrl.searchParams.get('ps') ?? '100');
    const start = (pageIndex - 1) * pageSize;
    requestedPages.push(pageIndex);

    return createFetchResponse({
      paging: {
        pageIndex,
        pageSize,
        total: history.length,
      },
      measures: [
        {
          metric: 'violations',
          history: history.slice(start, start + pageSize),
        },
      ],
    });
  };

  await runIssueHistory(
    {
      jobsJsonPath: '/tmp/project-jobs.json',
      peacheeRoot: '/tmp/peachee-js',
      outputPath: '/tmp/peach-issue-history.json',
      apiToken: 'test-token',
    },
    {
      readFileSync: filePath => {
        assert.equal(filePath, '/tmp/project-jobs.json');
        return JSON.stringify({
          total_jobs: 1,
          jobs: [
            {
              name: 'three-page-project',
              conclusion: 'success',
              head_sha: headSha,
              started_at: currentEntry.date,
              completed_at: new Date(Date.parse(currentEntry.date) + 10 * 60 * 1000).toISOString(),
            },
          ],
        });
      },
      writeFileSync: (filePath, content) => {
        output[filePath] = content;
      },
      existsSync: filePath => {
        assert.equal(filePath, '/tmp/peachee-js/three-page-project/sonar-project.properties');
        return true;
      },
      execFileSync: createGitExecFileSyncStub(headSha, {
        'three-page-project/sonar-project.properties': 'sonar.projectKey=js:ThreePageProject\n',
      }),
      sleep: async () => {},
      random: () => 0,
    },
  );

  assert.deepEqual(requestedPages, [1, 2, 3]);

  const report = JSON.parse(output['/tmp/peach-issue-history.json']);
  assert.deepEqual(report.summary, { OK: 1 });

  const row = report.rows[0];
  assert.equal(row.project_key, 'js:ThreePageProject');
  assert.equal(row.status, 'OK');
  assert.equal(row.analysis_date, currentEntry.date);
  assert.equal(row.current_value, 103);
  assert.equal(row.baseline_value, 100);
  assert.equal(row.history_points, 103);
  assert.equal(row.history_truncated, false);
});

test('runIssueHistory retries the full history fetch when a later page gets a retryable error', async t => {
  const headSha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const output = {};
  const requestedPages = [];
  let pageTwoFailures = 0;
  const originalFetch = globalThis.fetch;
  const endTimestamp = Date.UTC(2026, 4, 5, 3, 0, 0);
  const history = Array.from({ length: 203 }, (_, index) => ({
    date: new Date(endTimestamp - (202 - index) * 24 * 60 * 60 * 1000).toISOString(),
    value: String(index + 1),
  }));

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async url => {
    const parsedUrl = new URL(url);
    assert.equal(parsedUrl.hostname, 'peach.sonarsource.com');
    assert.equal(parsedUrl.pathname, '/api/measures/search_history');
    assert.equal(parsedUrl.searchParams.get('component'), 'js:RetriedProject');
    assert.equal(parsedUrl.searchParams.get('metrics'), 'violations');

    const pageIndex = Number(parsedUrl.searchParams.get('p') ?? '1');
    const pageSize = Number(parsedUrl.searchParams.get('ps') ?? '100');
    const start = (pageIndex - 1) * pageSize;
    requestedPages.push(pageIndex);

    if (pageIndex === 2 && pageTwoFailures === 0) {
      pageTwoFailures += 1;
      return createErrorFetchResponse(503);
    }

    return createFetchResponse({
      paging: {
        pageIndex,
        pageSize,
        total: history.length,
      },
      measures: [
        {
          metric: 'violations',
          history: history.slice(start, start + pageSize),
        },
      ],
    });
  };

  await runIssueHistory(
    {
      jobsJsonPath: '/tmp/project-jobs.json',
      peacheeRoot: '/tmp/peachee-js',
      outputPath: '/tmp/peach-issue-history.json',
      apiToken: 'test-token',
    },
    {
      readFileSync: filePath => {
        assert.equal(filePath, '/tmp/project-jobs.json');
        return JSON.stringify({
          total_jobs: 1,
          jobs: [
            {
              name: 'retried-project',
              conclusion: 'success',
              head_sha: headSha,
              started_at: '2026-05-05T03:10:46Z',
              completed_at: '2026-05-05T03:16:08Z',
            },
          ],
        });
      },
      writeFileSync: (filePath, content) => {
        output[filePath] = content;
      },
      existsSync: filePath => {
        assert.equal(filePath, '/tmp/peachee-js/retried-project/sonar-project.properties');
        return true;
      },
      execFileSync: createGitExecFileSyncStub(headSha, {
        'retried-project/sonar-project.properties': 'sonar.projectKey=js:RetriedProject\n',
      }),
      sleep: async () => {},
      random: () => 0,
    },
  );

  assert.equal(pageTwoFailures, 1);
  assert.deepEqual(requestedPages, [1, 2, 1, 2, 3]);

  const report = JSON.parse(output['/tmp/peach-issue-history.json']);
  assert.deepEqual(report.summary, { OK: 1 });

  const row = report.rows[0];
  assert.equal(row.project_key, 'js:RetriedProject');
  assert.equal(row.status, 'OK');
  assert.equal(row.analysis_date, '2026-05-05T03:00:00.000Z');
  assert.equal(row.current_value, 203);
  assert.equal(row.baseline_value, 200);
});

test('runIssueHistory omits drop metrics when a row has no measured drop', async () => {
  const report = await runSingleProjectIssueHistory({
    baselineValues: [100, 100],
    currentValue: 90,
    headSha: '8888888888888888888888888888888888888888',
    projectKey: 'js:ShortHistory',
    projectName: 'short-history',
  });

  assert.deepEqual(report.summary, { INSUFFICIENT_HISTORY: 1 });

  const row = report.rows[0];
  assert.equal(row.status, 'INSUFFICIENT_HISTORY');
  assert.equal(Object.hasOwn(row, 'drop_abs'), false);
  assert.equal(Object.hasOwn(row, 'drop_pct'), false);
});
