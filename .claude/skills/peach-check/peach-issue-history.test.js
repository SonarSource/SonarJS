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
