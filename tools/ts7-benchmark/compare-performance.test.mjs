import assert from 'node:assert/strict';
import { test } from 'node:test';
import { comparePerformance, renderComparison } from './compare-performance.mjs';

function reports() {
  const output = {
    files: ['file.ts'],
    issues: { S1: { 'file.ts': [1] } },
    diagnostics: { 'file.ts': { issues: [{ message: 'same', line: 1, column: 0 }] } },
    activeRules: { 'file.ts': ['S1'] },
    sourceHashes: { 'file.ts': 'hash' },
    programInputs: [{ rootCount: 1 }],
  };
  return ['classic', 'native'].flatMap(label =>
    [true, false].map(control => ({
      ...structuredClone(output),
      label,
      control,
      round: 1,
      valid: true,
      compilerBackend: label === 'classic' ? 'ts6' : 'ts7',
      compilerRevision: label === 'classic' ? 'ts6-head' : 'go-head',
      versions: { node: '24', parser: 'released' },
      instrumentation: { ownership: !control },
      timings: { analysisMs: control ? 100 : 110 },
      ...(!control
        ? {
            ownership: {
              totals: { totalMs: 110, consumerMs: 30, typeScriptMs: 70, unattributedMs: 10 },
              phases: {},
              components: {},
              unattributedReasons: {},
              sampling: {},
              sources: [],
            },
          }
        : {}),
    })),
  );
}

test('comparison pairs controls, preserves rich gates and renders calibrated measurements', () => {
  const comparison = comparePerformance(reports());
  assert.equal(comparison.parityPassed, true);
  assert.equal(comparison.backends.native.observedInstrumentationRatio.median, 1.1);
  assert.match(renderComparison(comparison), /Result parity: \*\*PASS/);
  const changed = reports();
  changed[3].diagnostics['file.ts'].issues[0].message = 'different';
  const failure = comparePerformance(changed);
  assert.equal(failure.parityPassed, false);
  assert.equal(failure.parity.mismatches[0].issueLinesMatch, true);
  assert.equal(failure.parity.mismatches[0].diagnosticsMatch, false);
});

test('missing controls, instrumented controls and mismatched rounds cannot produce an overhead claim', () => {
  assert.throws(() => comparePerformance(reports().filter(report => !report.control)), /Missing/);
  const instrumented = reports();
  instrumented[0].instrumentation.metrics = true;
  assert.throws(() => comparePerformance(instrumented), /Instrumented control/);
  const allocating = reports();
  allocating[0].instrumentation.allocation = true;
  assert.throws(() => comparePerformance(allocating), /Instrumented control/);
  const unpaired = reports();
  unpaired[1].round = 2;
  assert.throws(() => comparePerformance(unpaired), /Unpaired/);
});

test('separate SDK diagnostics are included and counter mismatches are rejected', () => {
  const diagnostics = reports()
    .filter(report => !report.control)
    .map(report => ({
      ...report,
      profile: {
        matchesSdkTotals: true,
        methods: { query: { requestCount: 3, roundTripMs: 12, bytesSent: 2, bytesReceived: 4 } },
        rules: { S1: { listenerCalls: 10, exclusiveMs: 4, requestCount: 3, roundTripMs: 12 } },
      },
      allocations: {
        estimatedBytes: 1024,
        owners: { 'compiler/facade-adapters': 1024 },
        gc: { count: 2, durationMs: 3 },
      },
    }));
  const comparison = comparePerformance(reports(), diagnostics);
  assert.equal(comparison.backends.native.detailed.methods[0].requestCount.median, 3);
  assert.match(renderComparison(comparison), /Separate instrumented diagnostics/);
  assert.equal(comparison.backends.native.allocations.estimatedBytes.median, 1024);
  assert.match(renderComparison(comparison), /Separate allocation and GC diagnostics/);
  assert.equal(comparison.diagnosticWorkload.listenerCountsMatch, true);
  diagnostics[1].profile.rules.S1.listenerCalls++;
  assert.equal(
    comparePerformance(reports(), diagnostics).diagnosticWorkload.listenerCountsMatch,
    false,
  );
  diagnostics[1].profile.matchesSdkTotals = false;
  assert.throws(() => comparePerformance(reports(), diagnostics), /matching SDK counters/);
});
