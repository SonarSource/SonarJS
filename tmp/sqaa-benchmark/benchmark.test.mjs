import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { compareIssues, sampleFiles } from './benchmark.mjs';

const script = join(dirname(fileURLToPath(import.meta.url)), 'benchmark.mjs');

test('exact comparison keeps duplicate findings and ignores other repositories', () => {
  const issue = { rule: 'javascript:S1', message: 'message', line: 2 };
  const actual = { rule: 'javascript:S1', message: 'message', textRange: { startLine: 2 } };
  const result = compareIssues([issue, issue], [actual, { rule: 'jssecurity:S2' }]);
  assert.equal(result.matched, 1);
  assert.equal(result.matchedByRule['javascript:S1'], 1);
  assert.equal(result.missing.length, 1);
  assert.equal(result.extra.length, 0);
});

test('sampling limits each rule independently; an explicit file selects only that file', () => {
  const records = [
    {
      project: 'project',
      issues: [
        { key: 'a', rule: 'javascript:S1', component: 'project:a.ts' },
        { key: 'b', rule: 'javascript:S1', component: 'project:b.ts' },
        { key: 'c', rule: 'css:S2', component: 'project:c.css' },
      ],
    },
  ];
  const sampled = sampleFiles(records, 1, [], []);
  assert.equal(sampled.selected.length, 2);
  const cohort = sampleFiles(records, 1, [], ['project:no-issues.ts']);
  assert.deepEqual(cohort.selected, ['project:no-issues.ts']);
  assert.deepEqual(cohort.allIssuesByComponent.get('project:no-issues.ts'), []);
});

function run(args, token = 'test-token') {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      env: { ...process.env, SONAR_TOKEN: token },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', chunk => {
      output += chunk;
    });
    child.stderr.on('data', chunk => {
      output += chunk;
    });
    child.on('close', code => (code === 0 ? resolve(output) : reject(new Error(output))));
  });
}

test('capture checkpoints a project and direct SQAA compare reuses its sealed baseline', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sqaa-benchmark-test-'));
  const issueQueries = [];
  let componentLookups = 0;
  let analysisCalls = 0;
  let analysisMode = 'success';
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const path = url.pathname;
    let result;
    if (path === '/api/project_analyses/search')
      result = { analyses: [{ key: 'analysis-1', revision: 'rev-1' }] };
    else if (path === '/api/project_branches/list')
      result = { branches: [{ isMain: true, branchId: 'branch-1' }] };
    else if (path === '/api/issues/search') {
      issueQueries.push(url.searchParams.get('componentKeys'));
      result = {
        paging: { total: 1 },
        components: [{ key: 'project:a.ts', qualifier: 'FIL' }],
        issues: [
          {
            key: 'issue-1',
            project: 'project',
            component: 'project:a.ts',
            rule: 'javascript:S1',
            message: 'message',
            textRange: { startLine: 1, startOffset: 0, endLine: 1, endOffset: 3 },
          },
        ],
      };
    }
    else if (path === '/api/sources/raw') {
      response.writeHead(200, { 'Content-Type': 'text/plain' });
      response.end('let a = 1');
      return;
    } else if (path === '/api/components/show') {
      componentLookups++;
      result = {
        component: { qualifier: url.searchParams.get('component') === 'project:test.ts' ? 'UTS' : 'FIL' },
      };
    }
    else if (path === '/analyses') {
      analysisCalls++;
      if (analysisMode === 'unavailable') {
        response.writeHead(503, { 'x-amzn-requestid': 'gateway-503' }).end();
        return;
      }
      if (analysisMode === 'invalid-context') {
        result = { id: 'request-2', errors: [{ code: 'INVALID_CONTEXT' }], issues: [] };
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(result));
        return;
      }
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (body.files[0].path === 'test.ts') {
        assert.equal(body.files[0].scope, 'TEST');
        result = { id: 'request-test', errors: [], issues: [] };
      } else {
        assert.equal(body.files[0].path, 'a.ts');
        assert.equal(body.files[0].scope, 'MAIN');
        result = {
          id: 'request-1',
          errors: [],
          issues: [
            {
              filePath: 'a.ts',
              rule: 'javascript:S1',
              message: 'message',
              textRange: { startLine: 1, startOffset: 0, endLine: 1, endOffset: 3 },
            },
          ],
        };
      }
    } else {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(result));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    const projects = join(directory, 'projects.txt');
    const baseline = join(directory, 'baseline');
    const comparison = join(directory, 'comparison');
    await writeFile(projects, 'project\n');
    await run([
      'capture',
      '--server-url',
      url,
      '--organization',
      'test',
      '--organization-id',
      'org-1',
      '--projects',
      projects,
      '--out',
      baseline,
      '--pace-ms',
      '1',
      '--analyzer-build',
      'test-build',
    ]);
    const saved = JSON.parse(await readFile(join(baseline, 'baseline.json'), 'utf8'));
    assert.equal(saved.files.length, 1);
    assert.equal(componentLookups, 0, 'issue metadata should provide file scope');
    await run([
      'capture',
      '--server-url', url,
      '--organization', 'test',
      '--organization-id', 'org-1',
      '--projects', projects,
      '--file', 'project:a.ts',
      '--out', join(directory, 'probe'),
      '--pace-ms', '1',
      '--analyzer-build', 'test-build',
    ]);
    assert.deepEqual(issueQueries, ['project', 'project:a.ts']);
    const excludedBaseline = join(directory, 'excluded-baseline');
    await run([
      'capture', '--server-url', url, '--organization', 'test',
      '--organization-id', 'org-1', '--projects', projects,
      '--exclude-file', 'project:a.ts', '--out', excludedBaseline,
      '--pace-ms', '1', '--analyzer-build', 'test-build',
    ]);
    const excluded = JSON.parse(await readFile(join(excludedBaseline, 'baseline.json'), 'utf8'));
    assert.deepEqual(excluded.files, []);
    assert.deepEqual(excluded.selection.excludedFiles, ['project:a.ts']);
    await run([
      'compare',
      '--baseline',
      join(baseline, 'baseline.json'),
      '--sqaa-url',
      `${url}/analyses`,
      '--out',
      comparison,
      '--deployment',
      'test-deployment',
    ]);
    const summary = JSON.parse(await readFile(join(comparison, 'summary.json'), 'utf8'));
    assert.equal(summary.matched, 1);
    assert.equal(summary.missing, 0);
    assert.equal(summary.extra, 0);
    assert.equal(summary.comparedFiles, 1);
    assert.equal(summary.completionCoveragePct, 100);
    const metrics = JSON.parse(await readFile(join(comparison, 'rule_metrics.json'), 'utf8'));
    assert.deepEqual(metrics.map(({ rule, matched }) => [rule, matched]), [['javascript:S1', 1]]);

    analysisMode = 'unavailable';
    await run([
      'compare', '--baseline', join(baseline, 'baseline.json'),
      '--sqaa-url', `${url}/analyses`, '--out', join(directory, 'unavailable'),
      '--deployment', 'test-deployment',
    ]);
    assert.equal(analysisCalls, 2, 'SQAA service errors must not be retried implicitly');
    const unavailable = JSON.parse(await readFile(join(directory, 'unavailable', 'summary.json'), 'utf8'));
    assert.equal(unavailable.httpErrors, 1);
    assert.equal(unavailable.comparedFiles, 0);
    const failedAttempt = JSON.parse((await readFile(
      join(directory, 'unavailable', 'results.jsonl'), 'utf8')).trim());
    assert.equal(failedAttempt.httpStatus, 503);
    assert.equal(failedAttempt.gatewayRequestId, 'gateway-503');

    analysisMode = 'invalid-context';
    await run([
      'compare', '--baseline', join(baseline, 'baseline.json'),
      '--sqaa-url', `${url}/analyses`, '--out', join(directory, 'invalid-context'),
      '--deployment', 'test-deployment',
    ]);
    const invalid = JSON.parse(await readFile(join(directory, 'invalid-context', 'summary.json'), 'utf8'));
    assert.equal(invalid.invalidContexts, 1);
    assert.equal(invalid.problemCodes.INVALID_CONTEXT, 1);

    analysisMode = 'success';
    const testBaseline = join(directory, 'test-baseline');
    await run([
      'capture', '--server-url', url, '--organization', 'test',
      '--organization-id', 'org-1', '--projects', projects,
      '--file', 'project:test.ts', '--out', testBaseline,
      '--pace-ms', '1', '--analyzer-build', 'test-build',
    ]);
    const testFileName = `${createHash('sha256').update('project:test.ts').digest('hex')}.json`;
    const testFile = JSON.parse(await readFile(join(testBaseline, 'files', testFileName), 'utf8'));
    assert.equal(testFile.scope, 'TEST');
    assert.equal(componentLookups, 1, 'issue-free files should fall back to a component lookup');
    await run([
      'compare', '--baseline', join(testBaseline, 'baseline.json'),
      '--sqaa-url', `${url}/analyses`, '--out', join(directory, 'test-comparison'),
      '--deployment', 'test-deployment',
    ]);
  } finally {
    server.close();
    if (!directory.startsWith(join(tmpdir(), 'sqaa-benchmark-test-'))) {
      throw new Error('Refusing to remove an unexpected test directory');
    }
    await rm(directory, { recursive: true, force: true });
  }
});
