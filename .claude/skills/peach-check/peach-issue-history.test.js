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
