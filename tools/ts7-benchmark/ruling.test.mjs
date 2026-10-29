import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const cli = path.join(repository, 'tools/ts7-benchmark/ruling.mjs');
const run = args =>
  spawnSync(process.execPath, [cli, ...args], {
    cwd: repository,
    encoding: 'utf8',
    timeout: 120_000,
  });

test(
  'ruling CLI completes real CSS/YAML projects and resumes without rerunning workers',
  { timeout: 180_000 },
  () => {
    const output = fs.mkdtempSync(
      path.join(repository, 'tools/ts7-benchmark/out/ruling-integration-'),
    );
    const args = [
      'run',
      '--corpus',
      repository,
      '--projects',
      'custom-css,custom-yaml',
      '--backends',
      'ts6,ts7',
      '--runs',
      '1',
      '--output',
      output,
    ];
    const first = run(args);
    assert.equal(first.status, 0, first.stdout + first.stderr);
    const summary = JSON.parse(fs.readFileSync(path.join(output, 'summary.json')));
    assert.equal(summary.completedWorkers, 4);
    assert.equal(summary.parityPassed, true);
    assert.ok(summary.projects.every(p => p.backends.ts6.files > 0));
    const worker = path.join(output, 'custom-yaml/ts7-1.json');
    const timestamp = fs.statSync(worker).mtimeMs;
    const completed = JSON.parse(fs.readFileSync(path.join(output, 'plan.json'))).completed;
    const second = run([...args, '--resume']);
    assert.equal(second.status, 0, second.stdout + second.stderr);
    assert.equal(fs.statSync(worker).mtimeMs, timestamp);
    assert.doesNotMatch(second.stdout, /\[1\/4\]/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(output, 'plan.json'))).completed, completed);
    const report = run(['report', '--output', output]);
    assert.equal(report.status, 0, report.stderr);

    // Simulate losing the driver after a worker wrote its body but before the
    // driver recorded process completion. That body cannot count as a success.
    const unfinished = JSON.parse(fs.readFileSync(worker));
    delete unfinished.exit;
    delete unfinished.timings.workerWallMs;
    fs.writeFileSync(worker, JSON.stringify(unfinished));
    assert.equal(run(['report', '--output', output, '--details']).status, 0);
    assert.equal(JSON.parse(fs.readFileSync(path.join(output, 'summary.json'))).complete, false);
    const details = JSON.parse(fs.readFileSync(path.join(output, 'differences.json')));
    assert.equal(details.validWorkers, 3);
    assert.deepEqual(details.projects.find(p => p.project === 'custom-yaml').comparisons, {});
    const third = run([...args, '--resume']);
    assert.equal(third.status, 0, third.stdout + third.stderr);
    assert.equal(JSON.parse(fs.readFileSync(worker)).exit.code, 0);
    const attempts = fs
      .readdirSync(path.dirname(worker))
      .filter(f => f.startsWith('ts7-1.attempt-'));
    assert.equal(attempts.length, 1);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(path.dirname(worker), attempts[0], 'ts7-1.json'))),
      unfinished,
    );
  },
);

test('failed ruling workers exit even with an active progress timer', { timeout: 25_000 }, () => {
  const output = fs.mkdtempSync(path.join(repository, 'tools/ts7-benchmark/out/ruling-failure-'));
  const project = path.join(output, 'corpus/ag-grid');
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(project, 'index.ts'), 'export const answer = 42;');
  fs.writeFileSync(
    path.join(project, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: { suppressImplicitAnyIndexErrors: true },
      files: ['index.ts'],
    }),
  );
  const timer = path.join(output, 'timer.mjs');
  fs.writeFileSync(timer, 'setInterval(() => {}, 1000);');
  const config = path.join(output, 'worker.config.json'),
    report = path.join(output, 'worker.json');
  fs.writeFileSync(
    config,
    JSON.stringify({
      name: 'ag-grid',
      backend: 'ts7',
      round: 1,
      corpus: path.join(output, 'corpus'),
      sources: path.join(repository, 'its/sources'),
    }),
  );
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      './packages/analysis/src/jsts/native/compatibility.mjs',
      '--import',
      'typescript',
      '--import',
      'tsx',
      '--import',
      timer,
      'tools/ts7-benchmark/ruling-worker.mjs',
      config,
      report,
    ],
    {
      cwd: repository,
      encoding: 'utf8',
      timeout: 15_000,
      env: { ...process.env, SONARJS_TYPESCRIPT_SOURCE: '1', SONARJS_TYPESCRIPT_BACKEND: 'ts7' },
    },
  );
  assert.equal(result.status, 2, result.stdout + result.stderr);
  const failure = JSON.parse(fs.readFileSync(report));
  assert.equal(failure.valid, false);
  assert.match(failure.errors[0].message, /suppressImplicitAnyIndexErrors/);
});

test('ruling inventory derives active membership from test entry points', () => {
  const result = run(['list']);
  assert.equal(result.status, 0, result.stderr);
  const projects = JSON.parse(result.stdout);
  assert.equal(projects.find(p => p.name === 'eslint').active, false);
  assert.equal(projects.find(p => p.name === 'ag-grid').active, true);
  assert.equal(
    projects.filter(p => p.active).length,
    fs
      .readdirSync(path.join(repository, 'packages/ruling/projects'))
      .filter(f => f.endsWith('.ruling.test.ts')).length,
  );
});

for (const args of [
  ['--unknown'],
  ['--runs'],
  ['--runs', '0'],
  ['--projects', 'missing'],
  ['--backends', 'ts7,ts7'],
])
  test(`ruling rejects malformed input ${args.join(' ')}`, () => {
    const result = run(['run', ...args]);
    assert.notEqual(result.status, 0);
  });
