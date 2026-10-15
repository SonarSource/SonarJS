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
