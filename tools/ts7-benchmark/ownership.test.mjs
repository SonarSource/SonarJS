import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { startCpuProfile } from './profiling.mjs';
import { createAnalysisTimeline, createOwnershipPolicy, summarizeOwnership } from './ownership.mjs';

const root = '/analysis';
const policy = createOwnershipPolicy({
  repository: root,
  classicRoot: `${root}/node_modules/typescript-classic`,
  sdkRoot: `${root}/node_modules/typescript-native`,
});
const frame = (id, url, children = [], functionName = 'work') => ({
  id,
  children,
  callFrame: { url, functionName },
});
const timeline = {
  startUs: 1000,
  endUs: 9000,
  phases: [
    { name: 'parse', startUs: 1000, endUs: 5000 },
    { name: 'lint', startUs: 5000, endUs: 9000 },
  ],
};

test('exclusive stacks handle parser callbacks, host callbacks and compiler reentry', () => {
  const profile = {
    startTime: 0,
    endTime: 10000,
    nodes: [
      frame(1, 'file:///analysis/tools/ts7-benchmark/worker.mjs', [2]),
      frame(2, 'file:///analysis/node_modules/typescript-classic/lib/typescript.js', [3, 9]),
      frame(3, 'file:///analysis/node_modules/@typescript-eslint/parser/visitor.js'),
      frame(4, 'file:///analysis/packages/analysis/src/jsts/program/compilerHost.ts', [5]),
      frame(5, 'file:///analysis/packages/typescript/native-compat.mjs', [6]),
      frame(6, 'node:fs'),
      frame(7, '', [], '(garbage collector)'),
      frame(8, 'file:///unclassified/callback.js'),
      frame(9, 'file:///analysis/tools/ts7-benchmark/profiling.mjs', [4]),
    ],
    samples: [2, 2, 3, 4, 6, 7, 8, 2],
    timeDeltas: [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000],
  };
  const report = summarizeOwnership(profile, timeline, policy);
  assert.deepEqual(report.totals, {
    consumerMs: 1,
    compilerMs: 3,
    hostMs: 1,
    unattributedMs: 3,
    totalMs: 8,
    typeScriptMs: 4,
    reconciliationErrorMs: 0,
  });
  assert.equal(report.phases.parse.typeScriptMs, 3);
  assert.equal(report.phases.parse.consumerMs, 1);
  assert.equal(report.phases.lint.unattributedMs, 3);
  assert.equal(report.unattributedReasons.unsampled, 1);
  assert.equal(report.unattributedReasons['(garbage collector)'], 1);
  assert.equal(report.unattributedReasons['unknown-source'], 1);
});

test('host code called by a consumer stays outside, while lazy WASM/SDK frames are inside', () => {
  const profile = {
    startTime: 0,
    endTime: 5000,
    nodes: [
      frame(1, 'file:///analysis/packages/analysis/src/jsts/builders/build.ts', [2]),
      frame(2, 'file:///analysis/packages/analysis/src/jsts/program/cache/sourceFileCache.ts'),
      frame(3, 'wasm://wasm/123'),
      frame(4, 'file:///analysis/node_modules/typescript-native/dist/ast/node.js'),
    ],
    samples: [2, 3, 4, 2],
    timeDeltas: [1000, 1000, 1000, 1000],
  };
  const report = summarizeOwnership(
    profile,
    { startUs: 0, endUs: 4000, phases: [{ name: 'all', startUs: 0, endUs: 4000 }] },
    policy,
  );
  assert.equal(report.totals.consumerMs, 2);
  assert.equal(report.components['wasm-execution'], 1);
  assert.equal(report.components['native-sdk'], 1);
  assert.equal(report.totals.hostMs, 0);
});

test('clip samples at phase/analysis boundaries and expose long gaps and empty profiles', () => {
  const profile = {
    startTime: 0,
    endTime: 30000,
    nodes: [frame(1, 'file:///analysis/packages/typescript/native.cjs')],
    samples: [1, 1],
    timeDeltas: [2000, 20000],
  };
  const report = summarizeOwnership(profile, timeline, policy);
  assert.equal(report.totals.compilerMs, 1);
  assert.equal(report.totals.unattributedMs, 7);
  assert.equal(report.unattributedReasons['long-sampling-gap'], 7);
  assert.equal(report.phases.parse.totalMs, 4);
  assert.equal(report.phases.lint.totalMs, 4);
  assert.equal(report.totals.reconciliationErrorMs, 0);
  const empty = summarizeOwnership({ ...profile, samples: [], timeDeltas: [] }, timeline, policy);
  assert.equal(empty.totals.unattributedMs, 8);
  assert.equal(empty.sampling.samples, 0);
  assert.throws(
    () => summarizeOwnership({ ...profile, samples: [] }, timeline, policy),
    /Incomplete/,
  );
  assert.throws(
    () => summarizeOwnership(profile, { ...timeline, endUs: 40000 }, policy),
    /monotonic/,
  );
});

test('slightly out-of-order V8 samples retain exact elapsed coverage and expose timestamp inversions', () => {
  const profile = {
    startTime: 0,
    endTime: 9000,
    nodes: [frame(1, 'file:///analysis/packages/typescript/native.cjs')],
    samples: [1, 1, 1, 1],
    timeDeltas: [2000, 1000, -41, 3041],
  };
  const report = summarizeOwnership(profile, timeline, policy);
  assert.equal(report.totals.compilerMs, 5);
  assert.equal(report.totals.unattributedMs, 3);
  assert.equal(report.totals.reconciliationErrorMs, 0);
  assert.equal(report.sampling.negativeDeltaCount, 1);
  assert.equal(report.sampling.maxBackwardMicros, 41);
  assert.throws(
    () =>
      summarizeOwnership({ ...profile, timeDeltas: [2000, 1000, -2000, 5000] }, timeline, policy),
    /inversion exceeds/,
  );
});

test('timeline records contiguous phases on the profiler clock', () => {
  let time = 10;
  const clock = createAnalysisTimeline(() => time);
  assert.equal(clock.start(), 10);
  time = 20;
  clock.phase('parse');
  time = 30;
  assert.deepEqual(clock.stop(), {
    startUs: 10,
    endUs: 30,
    phases: [
      { name: 'setup', startUs: 10, endUs: 20 },
      { name: 'parse', startUs: 20, endUs: 30 },
    ],
  });
  assert.throws(() => clock.phase('late'), /Inactive/);
});

test('live V8 calibration observes compiler work and a consumer callback inside it', async () => {
  const repository = fileURLToPath(new URL('../../', import.meta.url));
  const livePolicy = createOwnershipPolicy({ repository });
  const compiler = vm.runInThisContext(
    `(callback) => {
    const end = performance.now() + 30;
    while (performance.now() < end) Math.sqrt(performance.now());
    callback();
  }`,
    { filename: new URL('../../packages/typescript/calibration.js', import.meta.url).href },
  );
  const stop = await startCpuProfile();
  const clock = createAnalysisTimeline();
  clock.start();
  compiler(() => {
    const end = performance.now() + 30;
    while (performance.now() < end) Math.sqrt(performance.now());
  });
  const interval = clock.stop();
  const report = summarizeOwnership(await stop(), interval, livePolicy);
  assert.ok(report.totals.compilerMs > 5, JSON.stringify(report.totals));
  assert.ok(report.totals.consumerMs > 5, JSON.stringify(report.totals));
  assert.ok(Math.abs(report.totals.reconciliationErrorMs) < 0.01);
});
