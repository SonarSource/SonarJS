import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const directory = path.dirname(fileURLToPath(import.meta.url));

test(
  'SonarJS benchmark matches issues and active rules with archive record/replay',
  { timeout: 120_000 },
  () => {
    fs.mkdirSync(path.join(directory, 'out'), { recursive: true });
    const output = fs.mkdtempSync(path.join(directory, 'out', 'integration-'));
    const project = path.join(output, 'project');
    fs.cpSync(path.join(directory, 'fixtures/project'), project, { recursive: true });
    const input = path.join(project, 'index.ts');
    fs.writeFileSync(input, '// const commentedOut = 42;\n\n' + fs.readFileSync(input, 'utf8'));
    const run = (mode, target, archives) => {
      const child = spawnSync(
        process.execPath,
        [
          path.join(directory, 'benchmark.mjs'),
          ...(process.env.SONARJS_NATIVE_TEST_BACKEND === 'wasm'
            ? ['--native-backend', 'wasm']
            : []),
          '--runs',
          '1',
          '--rules',
          'all',
          '--project',
          project,
          '--archive-mode',
          mode,
          '--output',
          target,
          ...(archives ? ['--archive-dir', archives] : []),
          ...(mode === 'replay' ? ['--profile', '--cpu-profile'] : []),
        ],
        { encoding: 'utf8', windowsHide: true, timeout: 110_000 },
      );
      assert.equal(child.status, 0, child.stdout + child.stderr);
      const summary = JSON.parse(fs.readFileSync(path.join(target, 'summary.json'), 'utf8'));
      assert.equal(summary.valid, true);
      assert.equal(summary.filesMatch, true);
      assert.equal(summary.sourceTextsMatch, true);
      assert.equal(summary.stable, true);
      assert.equal(summary.activeRulesMatch, true);
      assert.equal(summary.issueLinesMatch, true);
      assert.ok(summary.classic.issues >= 3, 'exercise type-dependent and deprecation findings');
      const native = JSON.parse(fs.readFileSync(path.join(target, 'native-1.json'), 'utf8'));
      assert.ok(
        Object.values(native.issues['ts-S125'] ?? {}).some(lines => lines.includes(1)),
        'S125 must parse and report the comment fragment',
      );
      assert.deepEqual(native.unsupported, {});
      assert.deepEqual(native.checkerFailures, []);
      assert.ok(native.ipc.totals.requestCount > 0);
      if (mode === 'replay') {
        assert.equal(native.profile.matchesSdkTotals, true);
        assert.equal(native.profile.totals.requestCount, native.ipc.totals.requestCount);
        assert.equal(native.fileTimings.length, native.files.length);
        assert.ok(native.profile.rules.S125.listenerCalls > 0);
        assert.ok(fs.existsSync(native.cpuProfile.path));
        assert.ok(native.cpuProfile.samples > 0);
      } else {
        assert.equal(native.profile, undefined);
        assert.equal(native.cpuProfile, undefined);
      }
      assert.ok(Object.values(native.activeRules).some(rules => rules.includes('sonarjs/S1874')));
      return { summary, native };
    };
    const record = run('record', path.join(output, 'record'));
    const replay = run(
      'replay',
      path.join(output, 'replay'),
      path.join(output, 'record', 'archives'),
    );
    assert.deepEqual(replay.native.issues, record.native.issues);
    assert.deepEqual(replay.native.activeRules, record.native.activeRules);
    assert.deepEqual(replay.native.sourceHashes, record.native.sourceHashes);
    assert.equal(replay.summary.native.issues, record.summary.native.issues);
  },
);

for (const [args, message] of [
  [['--unknown-option'], /Unknown option/],
  [['--project'], /Missing value/],
  [['--runs', '0'], /positive integer/],
  [['--native-backend', 'invalid'], /must be ts7 or wasm/],
  [['--backends', 'ts7,wasm'], /requires ts6/],
  [['--backends', 'ts6,ts6'], /unique choices/],
  [['--sample-interval-us', '0'], /between 100 and 10000/],
  [['--calibrate'], /requires an instrumentation/],
]) {
  test(`benchmark rejects malformed input: ${args.join(' ')}`, () => {
    const child = spawnSync(process.execPath, [path.join(directory, 'benchmark.mjs'), ...args], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 5_000,
    });
    assert.notEqual(child.status, 0);
    assert.match(child.stderr, message);
  });
}

test('benchmark help does not launch workers', () => {
  const child = spawnSync(process.execPath, [path.join(directory, 'benchmark.mjs'), '--help'], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 5_000,
  });
  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout, /README\.md/);
});

test(
  'calibrated ownership reports preserve diagnostics and reconcile each backend',
  { timeout: 120_000 },
  () => {
    fs.mkdirSync(path.join(directory, 'out'), { recursive: true });
    const output = fs.mkdtempSync(path.join(directory, 'out', 'ownership-integration-'));
    const child = spawnSync(
      process.execPath,
      [
        path.join(directory, 'benchmark.mjs'),
        '--backends',
        process.env.SONARJS_TS7_WASM ? 'ts6,ts7,wasm,wasm-direct' : 'ts6,ts7',
        '--rules',
        'S4123',
        '--runs',
        '1',
        '--layer-profile',
        '--calibrate',
        '--output',
        output,
      ],
      { encoding: 'utf8', windowsHide: true, timeout: 110_000 },
    );
    assert.equal(child.status, 0, child.stdout + child.stderr);
    const summary = JSON.parse(fs.readFileSync(path.join(output, 'summary.json'), 'utf8'));
    assert.ok(summary.parityPassed);
    for (const { label } of summary.backends) {
      const report = JSON.parse(fs.readFileSync(path.join(output, `${label}-1.json`), 'utf8'));
      const control = JSON.parse(
        fs.readFileSync(path.join(output, `${label}-control-1.json`), 'utf8'),
      );
      assert.ok(report.ownership.sampling.samples > 0);
      assert.ok(Math.abs(report.ownership.totals.reconciliationErrorMs) < 0.01);
      assert.equal(report.ownership.totals.totalMs, report.timings.analysisMs);
      assert.ok(fs.existsSync(report.ownership.profilePath));
      assert.ok(report.hostCallbacks.readFile.calls > 0);
      assert.equal(control.ownership, undefined);
      assert.deepEqual(control.diagnostics, report.diagnostics);
      assert.ok(
        Object.values(report.diagnostics).some(value =>
          value.issues.some(issue => issue.message && issue.quickFixes?.length),
        ),
      );
      assert.equal(summary.calibration[label].instrumentedToControlRatio.count, 1);
    }
    const comparison = spawnSync(
      process.execPath,
      [path.join(directory, 'compare-performance.mjs'), output],
      { encoding: 'utf8', windowsHide: true, timeout: 5_000 },
    );
    assert.equal(comparison.status, 0, comparison.stdout + comparison.stderr);
    assert.ok(fs.existsSync(path.join(output, 'comparison.md')));
    assert.ok(fs.existsSync(path.join(output, 'provenance.json')));
  },
);
