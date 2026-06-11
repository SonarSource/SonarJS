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

import { main, runIssueHistory, SUPPORTED_LANGUAGES } from './peach-issue-history.js';

function expectedSummary(overrides = {}) {
  return {
    OK: 0,
    DROP: 0,
    INSUFFICIENT_HISTORY: 0,
    STALE: 0,
    UNRESOLVED_PROJECT: 0,
    ERROR: 0,
    ...overrides,
  };
}

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

function createMalformedJsonFetchResponse() {
  return {
    status: 200,
    headers: {
      get: () => null,
    },
    json: async () => {
      throw new SyntaxError('Unexpected end of JSON input');
    },
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

function formatExclusivePeachTimestamp(value) {
  const timestamp = Date.parse(value);
  return new Date(Math.floor(timestamp / 1000) * 1000 + 1000)
    .toISOString()
    .replace(/\.\d{3}Z$/, '+0000');
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

function consumeFailure(remainingFailures, failureKey) {
  if (!remainingFailures.has(failureKey)) {
    return undefined;
  }

  const failure = remainingFailures.get(failureKey);
  remainingFailures.delete(failureKey);

  if (typeof failure === 'number') {
    return {
      status: failure,
      body: 'temporary failure',
    };
  }

  return failure;
}

function consumeFirstMatchingFailure(remainingFailures, failureKeys) {
  for (const failureKey of failureKeys) {
    const failure = consumeFailure(remainingFailures, failureKey);
    if (failure) {
      return failure;
    }
  }

  return undefined;
}

function installPeachFetchMock(t, options) {
  const requests = {
    analyses: [],
    open: [],
    resolved: [],
    openCreatedAfter: [],
    openCreatedBefore: [],
    resolvedCreatedAfter: [],
    resolvedCreatedBefore: [],
    issueScopes: [],
    componentTree: [],
    activeIssueRequests: 0,
    maxConcurrentIssueRequests: 0,
  };
  const supportedLanguages = new Set(SUPPORTED_LANGUAGES);
  const remainingFailures = new Map(Object.entries(options.failOnce ?? {}));
  const issueSearchDelayMsByScope = new Map(Object.entries(options.issueSearchDelayMsByScope ?? {}));
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

      const failure = consumeFailure(remainingFailures, failureKey);
      if (failure) {
        if (failure.error) {
          throw failure.error;
        }
        if (failure.invalidJson) {
          return createMalformedJsonFetchResponse();
        }
        return createErrorFetchResponse(failure.status, failure.body);
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
      const createdAfterTimestamp = Date.parse(parsedUrl.searchParams.get('createdAfter') ?? '');
      const createdAfter = parsedUrl.searchParams.get('createdAfter');
      const createdBeforeTimestamp = Date.parse(parsedUrl.searchParams.get('createdBefore') ?? '');
      const createdBefore = parsedUrl.searchParams.get('createdBefore');
      const scopeKey = parsedUrl.searchParams.get('componentKeys') ?? parsedUrl.searchParams.get('components');
      const source = issueSources[scopeKey];
      assert.ok(source, `unexpected issue scope: ${scopeKey}`);
      const failureKey = `${resolved ? 'resolved' : 'open'}:${pageIndex}`;
      const start = (pageIndex - 1) * pageSize;

      if (resolved) {
        assert.equal(parsedUrl.searchParams.get('s'), 'CREATION_DATE');
        assert.equal(parsedUrl.searchParams.get('asc'), 'true');
        requests.resolved.push(pageIndex);
        requests.resolvedCreatedAfter.push(createdAfter);
        requests.resolvedCreatedBefore.push(createdBefore);
      } else {
        requests.open.push(pageIndex);
        requests.openCreatedAfter.push(createdAfter);
        requests.openCreatedBefore.push(createdBefore);
      }
      requests.issueScopes.push({ scopeKey, resolved, pageIndex, pageSize, createdAfter, createdBefore });

      requests.activeIssueRequests += 1;
      requests.maxConcurrentIssueRequests = Math.max(
        requests.maxConcurrentIssueRequests,
        requests.activeIssueRequests,
      );

      try {
        const delayMs = issueSearchDelayMsByScope.get(scopeKey) ?? 0;
        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        const failure = consumeFirstMatchingFailure(remainingFailures, [
          `${resolved ? 'resolved' : 'open'}:${pageIndex}:${createdBefore ?? ''}:${scopeKey}`,
          `${resolved ? 'resolved' : 'open'}:${pageIndex}:${createdBefore ?? ''}`,
          `${resolved ? 'resolved' : 'open'}:${createdBefore ?? ''}`,
          failureKey,
        ]);
        if (failure) {
          if (failure.error) {
            throw failure.error;
          }
          if (failure.invalidJson) {
            return createMalformedJsonFetchResponse();
          }
          return createErrorFetchResponse(failure.status, failure.body);
        }

        const sourceIssues = resolved ? source.resolvedIssues : source.openIssues;
        const filteredIssues = sourceIssues
          .filter(issue => supportedLanguages.has(issue.language))
          .filter(issue => requestedLanguages.has(issue.language))
          .filter(issue =>
            Number.isNaN(createdAfterTimestamp) ? true : Date.parse(issue.creationDate) >= createdAfterTimestamp,
          )
          .filter(issue =>
            Number.isNaN(createdBeforeTimestamp) ? true : Date.parse(issue.creationDate) < createdBeforeTimestamp,
          )
          .sort((left, right) => Date.parse(left.creationDate) - Date.parse(right.creationDate))
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
      } finally {
        requests.activeIssueRequests -= 1;
      }
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
    issueSearchDelayMsByScope,
    propertiesContent,
    runId = '25710841728',
    jobsCreatedAt,
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
    issueSearchDelayMsByScope,
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
          created_at: jobsCreatedAt,
          total_jobs: 1,
          jobs: [
            {
              name: projectName,
              conclusion: 'success',
              run_id: runId,
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
        [`${projectName}/sonar-project.properties`]:
          propertiesContent ?? `sonar.projectKey=${projectKey}\n`,
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
  assert.deepEqual(report.summary, expectedSummary({ OK: 1 }));
  assert.equal(report.blocking_rows_count, 0);
  assert.equal(report.clean_for_early_exit, true);

  const row = report.rows[0];
  assert.equal(row.metric, 'sonarjs_issue_count');
  assert.equal(row.project_key, 'js:FilteredProject');
  assert.equal(row.status, 'OK');
  assert.equal(row.analysis_date, analyses[5].date);
  assert.equal(row.current_value, 100);
  assert.equal(row.baseline_value, 100);
});

test('runIssueHistory ignores prepare-diff-val as a workflow-only job', async t => {
  const analyses = createDailyAnalyses('2026-04-26T03:10:35Z', 6);
  const output = {};
  installPeachFetchMock(t, {
    projectKey: 'js:ScopeProject',
    analyses,
    openIssues: createOpenIssues(100, '2026-04-01T00:00:00Z', 'js'),
    resolvedIssues: [],
  });
  const headSha = '1111111111111111111111111111111111111111';
  const completedAt = new Date(Date.parse(analyses[5].date) + 60 * 1000).toISOString();

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
          total_jobs: 2,
          jobs: [
            {
              name: 'prepare-diff-val',
              conclusion: 'success',
              run_id: '25710841728',
              head_sha: headSha,
              started_at: analyses[5].date,
              completed_at: completedAt,
            },
            {
              name: 'scope-project',
              conclusion: 'success',
              run_id: '25710841728',
              head_sha: headSha,
              started_at: analyses[5].date,
              completed_at: completedAt,
            },
          ],
        });
      },
      writeFileSync: (filePath, content) => {
        output[filePath] = content;
      },
      existsSync: filePath => {
        assert.equal(filePath, '/tmp/peachee-js/scope-project/sonar-project.properties');
        return true;
      },
      execFileSync: createGitExecFileSyncStub(headSha, {
        'scope-project/sonar-project.properties': 'sonar.projectKey=js:ScopeProject\n',
      }),
      sleep: async () => {},
      random: () => 0,
    },
  );

  const report = JSON.parse(output['/tmp/peach-issue-history.json']);
  assert.deepEqual(report.summary, expectedSummary({ OK: 1 }));
  assert.equal(report.blocking_rows_count, 0);
  assert.equal(report.clean_for_early_exit, true);
  assert.deepEqual(
    report.rows.map(row => row.project_dir),
    ['scope-project'],
  );
});

test('runIssueHistory does not allow early exit when no successful project jobs were analyzed', async () => {
  const output = {};

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
          total_jobs: 0,
          jobs: [],
        });
      },
      writeFileSync: (filePath, content) => {
        output[filePath] = content;
      },
      existsSync: () => false,
      sleep: async () => {},
      random: () => 0,
    },
  );

  const report = JSON.parse(output['/tmp/peach-issue-history.json']);
  assert.equal(report.source_jobs_total, 0);
  assert.equal(report.blocking_rows_count, 0);
  assert.equal(report.clean_for_early_exit, false);
  assert.deepEqual(report.summary, expectedSummary());
  assert.deepEqual(report.rows, []);
});

test('runIssueHistory reports project scope metadata and unambiguous freshness window bounds', async t => {
  const analyses = createDailyAnalyses('2026-04-26T03:10:35Z', 6);
  const { report } = await runSingleProjectIssueHistory(t, {
    analyses,
    openIssues: createOpenIssues(100, '2026-04-01T00:00:00Z', 'js'),
    resolvedIssues: [],
    projectKey: 'js:ScopeProject',
    projectName: 'scope-project',
    propertiesContent: [
      'sonar.projectKey=js:ScopeProject',
      'sonar.sources=src,e2e',
      'sonar.tests=test,e2e',
      '',
    ].join('\n'),
  });

  assert.equal(report.analysis_window_start, '2026-04-30T00:00:00Z');
  assert.equal(report.analysis_window_end, '2026-05-01T03:11:35Z');
  assert.equal(report.analysis_after, undefined);
  assert.equal(report.analysis_before, undefined);
  assert.match(report.generated_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.equal(report.source_run_id, '25710841728');
  assert.equal(report.source_head_sha, '1111111111111111111111111111111111111111');
  assert.equal(report.source_jobs_total, 1);
  assert.equal(report.source_job_completed_at_min, '2026-05-01T03:11:35Z');
  assert.equal(report.source_job_completed_at_max, '2026-05-01T03:11:35Z');

  const row = report.rows[0];
  assert.equal(row.project_dir, 'scope-project');
  assert.equal(row.has_sonar_tests, true);
  assert.deepEqual(row.sonar_sources, ['src', 'e2e']);
  assert.deepEqual(row.sonar_tests, ['test', 'e2e']);
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

  assert.deepEqual(report.summary, expectedSummary({ DROP: 1 }));
  assert.equal(report.blocking_rows_count, 1);
  assert.equal(report.clean_for_early_exit, false);

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

  assert.deepEqual(report.summary, expectedSummary({ OK: 1 }));

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

  assert.deepEqual(report.summary, expectedSummary({ OK: 1 }));

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

  assert.deepEqual(report.summary, expectedSummary({ OK: 1 }));

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

  assert.deepEqual(report.summary, expectedSummary({ STALE: 1 }));
  assert.equal(report.blocking_rows_count, 1);
  assert.equal(report.clean_for_early_exit, false);

  const row = report.rows[0];
  assert.equal(row.status, 'STALE');
  assert.equal(row.analysis_date, '2026-05-01T03:00:00Z');
  assert.equal(row.current_value, 50);
  assert.equal(row.message, 'Latest analysis is outside the freshness window');
});

test('runIssueHistory paginates analyses and uses page-1 open issue count queries with the supported-language filter', async t => {
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
  assert.deepEqual(requests.open, [1, 1, 1, 1, 1, 1]);
  assert.deepEqual(requests.resolved, [1]);
  assert.deepEqual(report.summary, expectedSummary({ OK: 1 }));

  const openSearches = requests.issueScopes.filter(entry => !entry.resolved);
  assert.equal(openSearches.length, 6);
  assert.ok(openSearches.every(entry => entry.scopeKey === 'js:LongLivedProject'));
  assert.ok(openSearches.every(entry => entry.pageIndex === 1));
  assert.ok(openSearches.every(entry => entry.pageSize === 1));

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

  assert.deepEqual(requests.openCreatedBefore, analyses.map(analysis => formatExclusivePeachTimestamp(analysis.date)));
  assert.ok(requests.openCreatedAfter.every(value => value === null));
  assert.deepEqual(
    requests.resolvedCreatedBefore,
    [formatExclusivePeachTimestamp(analyses[analyses.length - 1].date)],
  );
});

test('runIssueHistory splits capped resolved-issue searches across child components', async t => {
  const analyses = createDailyAnalyses('2026-04-26T03:09:22Z', 6);
  const futureCloseDate = '2026-05-02T00:00:00Z';
  const frontendIssues = createResolvedIssues(5001, '2026-04-01T00:00:00Z', futureCloseDate, 'js');
  const backendIssues = createResolvedIssues(5009, '2026-04-01T00:00:00Z', futureCloseDate, 'ts');
  const { report, requests } = await runSingleProjectIssueHistory(t, {
    analyses,
    openIssues: [],
    resolvedIssues: [],
    projectKey: 'js:CappedProject',
    projectName: 'capped-project',
    issueSources: {
      'js:CappedProject': {
        openIssues: [],
        resolvedIssues: [...frontendIssues, ...backendIssues],
      },
      'js:CappedProject:frontend': {
        openIssues: [],
        resolvedIssues: frontendIssues,
      },
      'js:CappedProject:backend': {
        openIssues: [],
        resolvedIssues: backendIssues,
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

  assert.deepEqual(report.summary, expectedSummary({ OK: 1 }));
  assert.equal(report.rows[0].current_value, 10010);
  assert.ok(requests.resolvedCreatedAfter.some(value => value));
  assert.ok(
    requests.componentTree.some(
      entry => entry.componentKey === 'js:CappedProject' && entry.qualifiers === 'DIR',
    ),
  );
  assert.ok(
    requests.issueScopes.some(entry => entry.scopeKey === 'js:CappedProject:frontend' && entry.resolved),
  );
  assert.ok(
    requests.issueScopes.some(entry => entry.scopeKey === 'js:CappedProject:backend' && entry.resolved),
  );
});

test('runIssueHistory counts >10k open issues without relying on component splits', async t => {
  const analyses = createDailyAnalyses('2026-04-26T03:09:22Z', 6);
  const { report, requests } = await runSingleProjectIssueHistory(t, {
    analyses,
    openIssues: [
      ...createOpenIssues(2500, '2026-03-01T00:00:00Z', 'js'),
      ...createOpenIssues(2500, '2026-03-15T00:00:00Z', 'ts'),
      ...createOpenIssues(2500, '2026-04-01T00:00:00Z', 'css'),
      ...createOpenIssues(2500, '2026-04-10T00:00:00Z', 'web'),
      ...createOpenIssues(10, '2026-04-20T00:00:00Z', 'yaml'),
    ],
    resolvedIssues: [],
    projectKey: 'js:TimeSplitOpenProject',
    projectName: 'time-split-open-project',
  });

  assert.deepEqual(report.summary, expectedSummary({ OK: 1 }));

  const row = report.rows[0];
  assert.equal(row.project_key, 'js:TimeSplitOpenProject');
  assert.equal(row.status, 'OK');
  assert.equal(row.current_value, 10010);
  assert.equal(row.baseline_value, 10010);

  const openSearches = requests.issueScopes.filter(entry => !entry.resolved);
  assert.deepEqual(requests.open, [1, 1, 1, 1, 1, 1]);
  assert.equal(openSearches.length, 6);
  assert.ok(openSearches.every(entry => entry.scopeKey === 'js:TimeSplitOpenProject'));
  assert.ok(openSearches.every(entry => entry.pageIndex === 1));
  assert.ok(openSearches.every(entry => entry.pageSize === 1));
  assert.ok(openSearches.every(entry => entry.createdAfter === null));
  assert.deepEqual(requests.componentTree, []);
});

test('runIssueHistory traverses resolved component-fallback child scopes with bounded concurrency', async t => {
  const analyses = createDailyAnalyses('2026-04-26T03:09:22Z', 6);
  const sharedCreationDate = '2026-04-01T00:00:00Z';
  const futureCloseDate = '2026-05-02T00:00:00Z';
  const childScopes = [
    'js:ConcurrentFallbackProject:file-1',
    'js:ConcurrentFallbackProject:file-2',
    'js:ConcurrentFallbackProject:file-3',
    'js:ConcurrentFallbackProject:file-4',
  ];
  const childIssues = Object.fromEntries(
    childScopes.map((scopeKey, index) => [
      scopeKey,
      {
        openIssues: [],
        resolvedIssues: createResolvedIssues(
          2501,
          sharedCreationDate,
          futureCloseDate,
          index % 2 === 0 ? 'js' : 'ts',
        ),
      },
    ]),
  );
  const { report, requests } = await runSingleProjectIssueHistory(t, {
    analyses,
    openIssues: [],
    resolvedIssues: childScopes.flatMap((scopeKey, index) =>
      createResolvedIssues(2501, sharedCreationDate, futureCloseDate, index % 2 === 0 ? 'js' : 'ts'),
    ),
    projectKey: 'js:ConcurrentFallbackProject',
    projectName: 'concurrent-fallback-project',
    issueSources: {
      'js:ConcurrentFallbackProject': {
        openIssues: [],
        resolvedIssues: childScopes.flatMap((scopeKey, index) =>
          createResolvedIssues(2501, sharedCreationDate, futureCloseDate, index % 2 === 0 ? 'js' : 'ts'),
        ),
      },
      ...childIssues,
    },
    componentChildren: {
      'js:ConcurrentFallbackProject': {
        dirs: [],
        files: childScopes.map((scopeKey, index) => ({
          key: scopeKey,
          path: `file-${index + 1}.ts`,
        })),
      },
      ...Object.fromEntries(childScopes.map(scopeKey => [scopeKey, { dirs: [], files: [] }])),
    },
    issueSearchDelayMsByScope: Object.fromEntries(childScopes.map(scopeKey => [scopeKey, 20])),
  });

  assert.deepEqual(report.summary, expectedSummary({ OK: 1 }));
  assert.ok(
    requests.maxConcurrentIssueRequests > 1,
    `expected concurrent child-scope traversal, got max concurrency ${requests.maxConcurrentIssueRequests}`,
  );
});

test('runIssueHistory counts >10k resolved issues without relying on component splits', async t => {
  const analyses = createDailyAnalyses('2026-04-26T03:09:22Z', 6);
  const futureCloseDate = '2026-05-02T00:00:00Z';
  const { report } = await runSingleProjectIssueHistory(t, {
    analyses,
    openIssues: createOpenIssues(50, '2026-03-01T00:00:00Z', 'js'),
    resolvedIssues: [
      ...createResolvedIssues(2500, '2026-03-01T00:00:00Z', futureCloseDate, 'js'),
      ...createResolvedIssues(2500, '2026-03-15T00:00:00Z', futureCloseDate, 'ts'),
      ...createResolvedIssues(2500, '2026-04-01T00:00:00Z', futureCloseDate, 'css'),
      ...createResolvedIssues(2500, '2026-04-10T00:00:00Z', futureCloseDate, 'web'),
      ...createResolvedIssues(10, '2026-04-20T00:00:00Z', futureCloseDate, 'yaml'),
    ],
    projectKey: 'js:TimeSplitResolvedProject',
    projectName: 'time-split-resolved-project',
  });

  assert.deepEqual(report.summary, expectedSummary({ OK: 1 }));

  const row = report.rows[0];
  assert.equal(row.project_key, 'js:TimeSplitResolvedProject');
  assert.equal(row.status, 'OK');
  assert.equal(row.current_value, 10060);
  assert.equal(row.baseline_value, 10060);
});

test('runIssueHistory retries only the failed open issue count query when a later analysis returns 503', async t => {
  const analyses = createDailyAnalyses('2026-01-01T03:00:00Z', 131);
  const retriedCreatedBefore = formatExclusivePeachTimestamp(analyses[129].date);
  const { report, requests } = await runSingleProjectIssueHistory(t, {
    analyses,
    openIssues: createOpenIssues(600, '2025-12-01T00:00:00Z', 'js'),
    resolvedIssues: [],
    projectKey: 'js:RetriedProject',
    projectName: 'retried-project',
    jobStartedAt: '2026-05-10T03:10:46Z',
    jobCompletedAt: '2026-05-10T03:16:08Z',
    failOnce: {
      [`open:1:${retriedCreatedBefore}`]: 503,
    },
  });

  assert.deepEqual(requests.analyses, [1, 2]);
  assert.deepEqual(requests.open, [1, 1, 1, 1, 1, 1, 1]);
  assert.deepEqual(requests.resolved, [1]);
  assert.deepEqual(report.summary, expectedSummary({ OK: 1 }));
  assert.equal(requests.openCreatedBefore.length, 7);
  assert.equal(requests.openCreatedBefore.filter(value => value === retriedCreatedBefore).length, 2);

  const row = report.rows[0];
  assert.equal(row.project_key, 'js:RetriedProject');
  assert.equal(row.status, 'OK');
  assert.equal(row.current_value, 600);
  assert.equal(row.baseline_value, 600);
});

test('runIssueHistory retries only the failed analyses page when Peach fetch rejects', async t => {
  const analyses = createDailyAnalyses('2026-01-01T03:00:00Z', 131);
  const { report, requests } = await runSingleProjectIssueHistory(t, {
    analyses,
    openIssues: createOpenIssues(100, '2025-12-01T00:00:00Z', 'js'),
    resolvedIssues: [],
    projectKey: 'js:RejectedAnalysesProject',
    projectName: 'rejected-analyses-project',
    jobStartedAt: '2026-05-10T03:10:46Z',
    jobCompletedAt: '2026-05-10T03:16:08Z',
    failOnce: {
      'analyses:2': {
        error: new TypeError('fetch failed'),
      },
    },
  });

  assert.deepEqual(requests.analyses, [1, 2, 2]);
  assert.deepEqual(requests.open, [1, 1, 1, 1, 1, 1]);
  assert.deepEqual(requests.resolved, [1]);
  assert.deepEqual(report.summary, expectedSummary({ OK: 1 }));

  const row = report.rows[0];
  assert.equal(row.project_key, 'js:RejectedAnalysesProject');
  assert.equal(row.status, 'OK');
  assert.equal(row.current_value, 100);
  assert.equal(row.baseline_value, 100);
});

test('runIssueHistory retries only the failed open issue count query when Peach returns malformed JSON', async t => {
  const analyses = createDailyAnalyses('2026-01-01T03:00:00Z', 131);
  const retriedCreatedBefore = formatExclusivePeachTimestamp(analyses[129].date);
  const { report, requests } = await runSingleProjectIssueHistory(t, {
    analyses,
    openIssues: createOpenIssues(600, '2025-12-01T00:00:00Z', 'js'),
    resolvedIssues: [],
    projectKey: 'js:MalformedJsonProject',
    projectName: 'malformed-json-project',
    jobStartedAt: '2026-05-10T03:10:46Z',
    jobCompletedAt: '2026-05-10T03:16:08Z',
    failOnce: {
      [`open:1:${retriedCreatedBefore}`]: {
        invalidJson: true,
      },
    },
  });

  assert.deepEqual(requests.analyses, [1, 2]);
  assert.deepEqual(requests.open, [1, 1, 1, 1, 1, 1, 1]);
  assert.deepEqual(requests.resolved, [1]);
  assert.deepEqual(report.summary, expectedSummary({ OK: 1 }));
  assert.equal(requests.openCreatedBefore.length, 7);
  assert.equal(requests.openCreatedBefore.filter(value => value === retriedCreatedBefore).length, 2);

  const row = report.rows[0];
  assert.equal(row.project_key, 'js:MalformedJsonProject');
  assert.equal(row.status, 'OK');
  assert.equal(row.current_value, 600);
  assert.equal(row.baseline_value, 600);
});

test('runIssueHistory retries bogus unknown-url 404 responses from project analyses', async t => {
  const analyses = createDailyAnalyses('2026-04-26T03:10:35Z', 6);
  const { report, requests } = await runSingleProjectIssueHistory(t, {
    analyses,
    openIssues: createOpenIssues(100, '2026-04-01T00:00:00Z', 'js'),
    resolvedIssues: [],
    projectKey: 'js:RetriedUnknownAnalysesProject',
    projectName: 'retried-unknown-analyses-project',
    failOnce: {
      'analyses:1': {
        status: 404,
        body: '{"errors":[{"msg":"Unknown url : /api/project_analyses/search"}]}',
      },
    },
  });

  assert.deepEqual(requests.analyses, [1, 1]);
  assert.deepEqual(report.summary, expectedSummary({ OK: 1 }));

  const row = report.rows[0];
  assert.equal(row.project_key, 'js:RetriedUnknownAnalysesProject');
  assert.equal(row.status, 'OK');
});

test('runIssueHistory retries bogus unknown-url 404 responses from open issue count queries', async t => {
  const analyses = createDailyAnalyses('2026-04-26T03:10:35Z', 6);
  const retriedCreatedBefore = formatExclusivePeachTimestamp(analyses[analyses.length - 1].date);
  const { report, requests } = await runSingleProjectIssueHistory(t, {
    analyses,
    openIssues: createOpenIssues(100, '2026-04-01T00:00:00Z', 'js'),
    resolvedIssues: [],
    projectKey: 'js:RetriedUnknownIssuesProject',
    projectName: 'retried-unknown-issues-project',
    failOnce: {
      [`open:1:${retriedCreatedBefore}`]: {
        status: 404,
        body: '{"errors":[{"msg":"Unknown url : /api/issues/search"}]}',
      },
    },
  });

  assert.deepEqual(requests.open, [1, 1, 1, 1, 1, 1, 1]);
  assert.deepEqual(requests.resolved, [1]);
  assert.deepEqual(report.summary, expectedSummary({ OK: 1 }));
  assert.equal(requests.openCreatedBefore.length, 7);
  assert.equal(requests.openCreatedBefore.filter(value => value === retriedCreatedBefore).length, 2);

  const row = report.rows[0];
  assert.equal(row.project_key, 'js:RetriedUnknownIssuesProject');
  assert.equal(row.status, 'OK');
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

  assert.deepEqual(report.summary, expectedSummary({ INSUFFICIENT_HISTORY: 1 }));
  assert.equal(report.blocking_rows_count, 0);
  assert.equal(report.clean_for_early_exit, true);

  const row = report.rows[0];
  assert.equal(row.status, 'INSUFFICIENT_HISTORY');
  assert.equal(Object.hasOwn(row, 'drop_abs'), false);
  assert.equal(Object.hasOwn(row, 'drop_pct'), false);
});

test('main prints concise progress lines for CLI use', async () => {
  const logLines = [];

  await main(
    ['/tmp/project-jobs.json', '/tmp/peachee-js', '/tmp/peach-issue-history.json'],
    {
      log: message => {
        logLines.push(message);
      },
      runIssueHistory: async () => ({}),
    },
  );

  assert.deepEqual(logLines, [
    'peach-issue-history: starting /tmp/project-jobs.json -> /tmp/peach-issue-history.json',
    'peach-issue-history: wrote /tmp/peach-issue-history.json',
  ]);
});
