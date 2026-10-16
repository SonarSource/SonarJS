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
    const second = run([...args, '--resume']);
    assert.equal(second.status, 0, second.stdout + second.stderr);
    assert.equal(fs.statSync(worker).mtimeMs, timestamp);
    assert.doesNotMatch(second.stdout, /\[1\/4\]/);
    const report = run(['report', '--output', output]);
    assert.equal(report.status, 0, report.stderr);
  },
);

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
