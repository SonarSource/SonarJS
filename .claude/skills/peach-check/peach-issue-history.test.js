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

const SUPPORTED_LANGUAGES = ['js', 'ts', 'css', 'web', 'yaml'];

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

function createDailyAnalyses(startDate, count) {
  const startTimestamp = Date.parse(startDate);
  return Array.from({ length: count }, (_, index) => ({
    date: new Date(startTimestamp + index * 24 * 60 * 60 * 1000).toISOString(),
  }));
}

function createOpenIssues(count, creationDate, language = 'js') {
  return Array.from({ length: count }, (_, index) => ({
    key: `open-${language}-${index}`,
    creationDate,
    language,
  }));
}

function createResolvedIssues(count, creationDate, closeDate, language = 'js') {
  return Array.from({ length: count }, (_, index) => ({
    key: `resolved-${language}-${index}`,
    creationDate,
    closeDate,
    language,
  }));
}

function installPeachFetchMock(t, options) {
  const requests = {
    analyses: [],
    open: [],
    resolved: [],
    openCreatedBefore: [],
    resolvedCreatedBefore: [],
    issueScopes: [],
    componentTree: [],
  };
  const supportedLanguages = new Set(SUPPORTED_LANGUAGES);
  const remainingFailures = new Map(Object.entries(options.failOnce ?? {}));
  const originalFetch = globalThis.fetch;
  const analysesDesc = [...options.analyses].sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
  const issueSources = options.issueSources ?? {
    [options.projectKey]: {
      openIssues: options.openIssues,
      resolvedIssues: options.resolvedIssues,
    },
  };
  const componentChildren = options.componentChildren ?? {};

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async url => {
    const parsedUrl = new URL(url);
    assert.equal(parsedUrl.hostname, 'peach.sonarsource.com');

    if (parsedUrl.pathname === '/api/project_analyses/search') {
      assert.equal(parsedUrl.searchParams.get('project'), options.projectKey);

      const pageIndex = Number(parsedUrl.searchParams.get('p') ?? '1');
      const pageSize = Number(parsedUrl.searchParams.get('ps') ?? '100');
      const start = (pageIndex - 1) * pageSize;
      const failureKey = `analyses:${pageIndex}`;
      requests.analyses.push(pageIndex);

      if (remainingFailures.has(failureKey)) {
        const failureStatus = remainingFailures.get(failureKey);
        remainingFailures.delete(failureKey);
        return createErrorFetchResponse(failureStatus);
      }

      return createFetchResponse({
        paging: {
          pageIndex,
          pageSize,
          total: analysesDesc.length,
        },
        analyses: analysesDesc.slice(start, start + pageSize),
      });
    }

    if (parsedUrl.pathname === '/api/issues/search') {
      assert.equal(parsedUrl.searchParams.get('languages'), SUPPORTED_LANGUAGES.join(','));

      const requestedLanguages = new Set(parsedUrl.searchParams.get('languages').split(','));
      const resolved = parsedUrl.searchParams.get('resolved') === 'true';
      const pageIndex = Number(parsedUrl.searchParams.get('p') ?? '1');
      const pageSize = Number(parsedUrl.searchParams.get('ps') ?? '500');
      const createdBeforeTimestamp = Date.parse(parsedUrl.searchParams.get('createdBefore') ?? '');
      const createdBefore = parsedUrl.searchParams.get('createdBefore');
      const scopeKey = parsedUrl.searchParams.get('componentKeys') ?? parsedUrl.searchParams.get('components');
      const source = issueSources[scopeKey];
      assert.ok(source, `unexpected issue scope: ${scopeKey}`);
      const failureKey = `${resolved ? 'resolved' : 'open'}:${pageIndex}`;
      const start = (pageIndex - 1) * pageSize;

      if (resolved) {
        assert.equal(parsedUrl.searchParams.get('s'), 'CLOSE_DATE');
        assert.equal(parsedUrl.searchParams.get('asc'), 'false');
        requests.resolved.push(pageIndex);
        requests.resolvedCreatedBefore.push(createdBefore);
      } else {
        assert.equal(parsedUrl.searchParams.get('s'), 'CREATION_DATE');
        assert.equal(parsedUrl.searchParams.get('asc'), 'true');
        requests.open.push(pageIndex);
        requests.openCreatedBefore.push(createdBefore);
      }
      requests.issueScopes.push({ scopeKey, resolved, pageIndex });

      if (remainingFailures.has(failureKey)) {
        const failureStatus = remainingFailures.get(failureKey);
        remainingFailures.delete(failureKey);
        return createErrorFetchResponse(failureStatus);
      }

      const sourceIssues = resolved ? source.resolvedIssues : source.openIssues;
      const filteredIssues = sourceIssues
        .filter(issue => supportedLanguages.has(issue.language))
        .filter(issue => requestedLanguages.has(issue.language))
        .filter(issue =>
          Number.isNaN(createdBeforeTimestamp) ? true : Date.parse(issue.creationDate) < createdBeforeTimestamp,
        )
        .sort((left, right) => {
          if (resolved) {
            return Date.parse(right.closeDate) - Date.parse(left.closeDate);
          }
          return Date.parse(left.creationDate) - Date.parse(right.creationDate);
        })
        .map(issue => {
          const responseIssue = {
            key: issue.key,
            creationDate: issue.creationDate,
          };
          if (resolved) {
            responseIssue.closeDate = issue.closeDate;
          }
          return responseIssue;
        });

      if (filteredIssues.length > 10000 && start >= 10000) {
        return createErrorFetchResponse(
          400,
          '{"errors":[{"msg":"Can return only the first 10000 results. 10500th result asked."}]}',
        );
      }

      return createFetchResponse({
        paging: {
          pageIndex,
          pageSize,
          total: filteredIssues.length,
        },
        issues: filteredIssues.slice(start, start + pageSize),
      });
    }

    if (parsedUrl.pathname === '/api/components/tree') {
      const componentKey = parsedUrl.searchParams.get('component');
      const qualifiers = parsedUrl.searchParams.get('qualifiers');
      const strategy = parsedUrl.searchParams.get('strategy');
      const pageIndex = Number(parsedUrl.searchParams.get('p') ?? '1');
      const pageSize = Number(parsedUrl.searchParams.get('ps') ?? '500');
      const start = (pageIndex - 1) * pageSize;
      const children = componentChildren[componentKey] ?? { dirs: [], files: [] };

      assert.equal(strategy, 'children');
      requests.componentTree.push({ componentKey, qualifiers, pageIndex });

      let components;
      if (qualifiers === 'DIR') {
        components = children.dirs;
      } else if (qualifiers === 'FIL') {
        components = children.files;
      } else {
        throw new Error(`unexpected qualifiers: ${qualifiers}`);
      }

      return createFetchResponse({
        paging: {
          pageIndex,
          pageSize,
          total: components.length,
        },
        components: components.slice(start, start + pageSize),
      });
    }

    throw new Error(`unexpected fetch URL: ${parsedUrl.pathname}`);
  };

  return requests;
}

async function runSingleProjectIssueHistory(
  t,
  {
    analyses,
    openIssues,
    resolvedIssues,
    headSha = '1111111111111111111111111111111111111111',
    projectKey = 'js:TestProject',
    projectName = 'test-project',
    thresholdPct = 5,
    thresholdAbs = 20,
    jobStartedAt,
    jobCompletedAt,
    failOnce,
    issueSources,
    componentChildren,
  },
) {
  const output = {};
  const requests = installPeachFetchMock(t, {
    projectKey,
    analyses,
    openIssues,
    resolvedIssues,
    failOnce,
    issueSources,
    componentChildren,
  });
  const effectiveStartedAt = jobStartedAt ?? analyses[analyses.length - 1].date;
  const effectiveCompletedAt =
    jobCompletedAt ?? new Date(Date.parse(effectiveStartedAt) + 60 * 1000).toISOString();

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
              started_at: effectiveStartedAt,
              completed_at: effectiveCompletedAt,
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
      sleep: async () => {},
      random: () => 0,
    },
  );

  return {
    report: JSON.parse(output['/tmp/peach-issue-history.json']),
    requests,
  };
}

test('runIssueHistory filters to SonarJS-supported languages and ignores unsupported closures', async t => {
  const analyses = createDailyAnalyses('2026-04-26T03:10:35Z', 6);
  const { report } = await runSingleProjectIssueHistory(t, {
    analyses,
    openIssues: createOpenIssues(100, '2026-04-01T00:00:00Z', 'js'),
    resolvedIssues: createResolvedIssues(531, '2026-04-01T00:00:00Z', analyses[5].date, 'py'),
    projectKey: 'js:FilteredProject',
    projectName: 'filtered-project',
  });

  assert.deepEqual(report.languages, SUPPORTED_LANGUAGES);
  assert.deepEqual(report.summary, { OK: 1 });

  const row = report.rows[0];
  assert.equal(row.metric, 'violations');
  assert.equal(row.project_key, 'js:FilteredProject');
  assert.equal(row.status, 'OK');
  assert.equal(row.analysis_date, analyses[5].date);
  assert.equal(row.current_value, 100);
  assert.equal(row.baseline_value, 100);
});

test('runIssueHistory marks DROP when supported-language issue counts fall enough', async t => {
  const analyses = createDailyAnalyses('2026-04-26T03:10:35Z', 6);
  const { report } = await runSingleProjectIssueHistory(t, {
    analyses,
    openIssues: createOpenIssues(7, '2026-04-01T00:00:00Z', 'js'),
    resolvedIssues: createResolvedIssues(3, '2026-04-01T00:00:00Z', analyses[5].date, 'ts'),
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

test('runIssueHistory keeps high-percentage drops OK below the absolute noise floor', async t => {
  const analyses = createDailyAnalyses('2026-04-26T03:10:35Z', 6);
  const { report } = await runSingleProjectIssueHistory(t, {
    analyses,
    openIssues: createOpenIssues(9, '2026-04-01T00:00:00Z', 'js'),
    resolvedIssues: createResolvedIssues(1, '2026-04-01T00:00:00Z', analyses[5].date, 'web'),
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

test('runIssueHistory keeps drops OK when only the absolute threshold is exceeded', async t => {
  const analyses = createDailyAnalyses('2026-04-26T03:10:35Z', 6);
  const { report } = await runSingleProjectIssueHistory(t, {
    analyses,
    openIssues: createOpenIssues(79, '2026-04-01T00:00:00Z', 'css'),
    resolvedIssues: createResolvedIssues(21, '2026-04-01T00:00:00Z', analyses[5].date, 'css'),
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

test('runIssueHistory keeps the in-window analysis when later analyses exist', async t => {
  const analyses = createDailyAnalyses('2026-04-28T03:00:00Z', 8);
  const currentAnalysis = analyses[5];
  const { report } = await runSingleProjectIssueHistory(t, {
    analyses,
    openIssues: [
      ...createOpenIssues(100, '2026-04-01T00:00:00Z', 'js'),
      ...createOpenIssues(3, currentAnalysis.date, 'ts'),
      ...createOpenIssues(50, analyses[6].date, 'js'),
    ],
    resolvedIssues: [],
    projectKey: 'js:WindowedProject',
    projectName: 'windowed-project',
    jobStartedAt: '2026-05-03T03:10:46Z',
    jobCompletedAt: '2026-05-03T03:16:08Z',
  });

  assert.deepEqual(report.summary, { OK: 1 });

  const row = report.rows[0];
  assert.equal(row.project_key, 'js:WindowedProject');
  assert.equal(row.status, 'OK');
  assert.equal(row.analysis_date, currentAnalysis.date);
  assert.equal(row.current_value, 103);
  assert.equal(row.baseline_value, 100);
  assert.equal(row.history_points, 6);
});

test('runIssueHistory reports STALE when no analysis falls inside the run window', async t => {
  const analyses = [{ date: '2026-05-01T03:00:00Z' }];
  const { report } = await runSingleProjectIssueHistory(t, {
    analyses,
    openIssues: createOpenIssues(50, '2026-04-01T00:00:00Z', 'js'),
    resolvedIssues: [],
    projectKey: 'js:StaleProject',
    projectName: 'stale-project',
    jobStartedAt: '2026-05-05T03:10:46Z',
    jobCompletedAt: '2026-05-05T03:16:08Z',
  });

  assert.deepEqual(report.summary, { STALE: 1 });

  const row = report.rows[0];
  assert.equal(row.status, 'STALE');
  assert.equal(row.analysis_date, '2026-05-01T03:00:00Z');
  assert.equal(row.current_value, 50);
  assert.equal(row.message, 'Latest analysis is outside the freshness window');
});

test('runIssueHistory paginates analyses and issue snapshots with the supported-language filter', async t => {
  const analyses = createDailyAnalyses('2026-01-01T03:00:00Z', 131);
  const { report, requests } = await runSingleProjectIssueHistory(t, {
    analyses,
    openIssues: createOpenIssues(600, '2025-12-01T00:00:00Z', 'js'),
    resolvedIssues: [],
    projectKey: 'js:LongLivedProject',
    projectName: 'long-lived-project',
    jobStartedAt: '2026-05-10T03:10:46Z',
    jobCompletedAt: '2026-05-10T03:16:08Z',
  });

  assert.deepEqual(requests.analyses, [1, 2]);
  assert.deepEqual(requests.open, [1, 2]);
  assert.deepEqual(requests.resolved, [1]);
  assert.deepEqual(report.summary, { OK: 1 });

  const row = report.rows[0];
  assert.equal(row.project_key, 'js:LongLivedProject');
  assert.equal(row.status, 'OK');
  assert.equal(row.current_value, 600);
  assert.equal(row.baseline_value, 600);
});

test('runIssueHistory formats Peach issue-search timestamps with a UTC offset', async t => {
  const analyses = createDailyAnalyses('2026-04-26T03:09:22Z', 6);
  const { requests } = await runSingleProjectIssueHistory(t, {
    analyses,
    openIssues: createOpenIssues(10, '2026-04-01T00:00:00Z', 'js'),
    resolvedIssues: [],
    projectKey: 'js:TimestampProject',
    projectName: 'timestamp-project',
  });

  assert.deepEqual(requests.openCreatedBefore, ['2026-05-01T03:09:23+0000']);
  assert.deepEqual(requests.resolvedCreatedBefore, ['2026-05-01T03:09:23+0000']);
});

test('runIssueHistory splits capped issue searches across child components', async t => {
  const analyses = createDailyAnalyses('2026-04-26T03:09:22Z', 6);
  const frontendIssues = createOpenIssues(5001, '2026-04-01T00:00:00Z', 'js');
  const backendIssues = createOpenIssues(5009, '2026-04-01T00:00:00Z', 'ts');
  const { report, requests } = await runSingleProjectIssueHistory(t, {
    analyses,
    openIssues: [],
    resolvedIssues: [],
    projectKey: 'js:CappedProject',
    projectName: 'capped-project',
    issueSources: {
      'js:CappedProject': {
        openIssues: [...frontendIssues, ...backendIssues],
        resolvedIssues: [],
      },
      'js:CappedProject:frontend': {
        openIssues: frontendIssues,
        resolvedIssues: [],
      },
      'js:CappedProject:backend': {
        openIssues: backendIssues,
        resolvedIssues: [],
      },
    },
    componentChildren: {
      'js:CappedProject': {
        dirs: [
          { key: 'js:CappedProject:frontend', path: 'frontend' },
          { key: 'js:CappedProject:backend', path: 'backend' },
        ],
        files: [],
      },
      'js:CappedProject:frontend': { dirs: [], files: [] },
      'js:CappedProject:backend': { dirs: [], files: [] },
    },
  });

  assert.deepEqual(report.summary, { OK: 1 });
  assert.equal(report.rows[0].current_value, 10010);
  assert.ok(
    requests.componentTree.some(
      entry => entry.componentKey === 'js:CappedProject' && entry.qualifiers === 'DIR',
    ),
  );
  assert.ok(
    requests.issueScopes.some(entry => entry.scopeKey === 'js:CappedProject:frontend' && !entry.resolved),
  );
  assert.ok(
    requests.issueScopes.some(entry => entry.scopeKey === 'js:CappedProject:backend' && !entry.resolved),
  );
});

test('runIssueHistory retries the full issue snapshot fetch when a later open-issues page fails', async t => {
  const analyses = createDailyAnalyses('2026-01-01T03:00:00Z', 131);
  const { report, requests } = await runSingleProjectIssueHistory(t, {
    analyses,
    openIssues: createOpenIssues(600, '2025-12-01T00:00:00Z', 'js'),
    resolvedIssues: [],
    projectKey: 'js:RetriedProject',
    projectName: 'retried-project',
    jobStartedAt: '2026-05-10T03:10:46Z',
    jobCompletedAt: '2026-05-10T03:16:08Z',
    failOnce: {
      'open:2': 503,
    },
  });

  assert.deepEqual(requests.analyses, [1, 2]);
  assert.deepEqual(requests.open, [1, 2, 1, 2]);
  assert.deepEqual(requests.resolved, [1]);
  assert.deepEqual(report.summary, { OK: 1 });

  const row = report.rows[0];
  assert.equal(row.project_key, 'js:RetriedProject');
  assert.equal(row.status, 'OK');
  assert.equal(row.current_value, 600);
  assert.equal(row.baseline_value, 600);
});

test('runIssueHistory omits drop metrics when a row has insufficient history', async t => {
  const analyses = createDailyAnalyses('2026-04-29T03:10:35Z', 3);
  const { report } = await runSingleProjectIssueHistory(t, {
    analyses,
    openIssues: createOpenIssues(90, '2026-04-01T00:00:00Z', 'js'),
    resolvedIssues: createResolvedIssues(10, '2026-04-01T00:00:00Z', analyses[2].date, 'js'),
    projectKey: 'js:ShortHistory',
    projectName: 'short-history',
  });

  assert.deepEqual(report.summary, { INSUFFICIENT_HISTORY: 1 });

  const row = report.rows[0];
  assert.equal(row.status, 'INSUFFICIENT_HISTORY');
  assert.equal(Object.hasOwn(row, 'drop_abs'), false);
  assert.equal(Object.hasOwn(row, 'drop_pct'), false);
});
