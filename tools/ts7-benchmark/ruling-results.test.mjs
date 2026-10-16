import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarizeRuling, renderRuling, compactRulingReport } from './ruling-results.mjs';
import { backendOrder } from './backends.mjs';
const plan = {
  projects: [
    { name: 'a', active: true },
    { name: 'b', active: true },
    { name: 'inactive', active: false },
  ],
  backends: ['ts6', 'ts7'],
  runs: 2,
};
function reports() {
  return plan.projects
    .filter(p => p.active)
    .flatMap((p, i) =>
      plan.backends.flatMap(backend =>
        [1, 2].map(round => ({
          project: p.name,
          backend,
          round,
          valid: true,
          files: ['file.ts'],
          sourceHashes: {},
          issues: {},
          diagnostics: {},
          activeRules: {},
          programInputs: [],
          resultFiles: ['file.ts'],
          configuration: {},
          ruleConfigurationHash: 'same',
          noProgramFiles: [],
          issueCount: 0,
          timings: { analysisMs: (i + 1) * 100 + round, workerWallMs: (i + 1) * 100 + round + 10 },
        })),
      ),
    );
}
test('overall totals sum each full round before computing a distribution', () => {
  const result = summarizeRuling(plan, reports());
  assert.equal(result.parityPassed, true);
  assert.deepEqual(result.comparableCohort.ts6.analysisMs.values, [302, 304]);
  assert.equal(result.comparableCohort.ts6.analysisMs.median, 303);
  assert.equal(result.plannedWorkers, 8);
  assert.deepEqual(result.inactiveProjects, ['inactive']);
});
test('failures and missing reports cannot pass or enter a comparable cohort', () => {
  const all = reports();
  all[0].valid = false;
  all[0].errors = [{ message: 'timeout' }];
  all.pop();
  const result = summarizeRuling(plan, all);
  assert.equal(result.complete, false);
  assert.equal(result.parityPassed, false);
  assert.equal(result.comparableCohort.ts6.projects, 0);
  assert.match(renderRuling(result, plan), /not full-suite performance/);
});
test('a changed fix, file role, active rule, program selection or missing result fails parity', () => {
  for (const change of [
    r => (r.diagnostics = { file: { issues: [{ fix: { text: 'different' } }] } }),
    r => (r.sourceHashes = { file: { ruleFileType: 'TEST' } }),
    r => (r.activeRules = { file: ['S1'] }),
    r => (r.noProgramFiles = ['file.ts']),
    r => (r.resultFiles = []),
  ]) {
    const all = reports();
    change(all[2]);
    const result = summarizeRuling(plan, all);
    assert.equal(result.parityProjects, 1);
    assert.equal(result.validProjects, 2);
    assert.equal(result.comparableCohort.ts7.projects, 1);
    assert.equal(result.projects[0].mismatches.length, 1);
  }
});
test('backend order rotates positions and reverses the second block', () => {
  assert.deepEqual(backendOrder(['a', 'b', 'c'], 0), ['a', 'b', 'c']);
  assert.deepEqual(backendOrder(['a', 'b', 'c'], 1), ['b', 'c', 'a']);
  assert.deepEqual(backendOrder(['a', 'b', 'c'], 3), ['c', 'b', 'a']);
});

test('duplicate or unexpected workers cannot satisfy completion', () => {
  const all = reports();
  assert.throws(() => summarizeRuling(plan, [...all, all[0]]), /Duplicate worker/);
  assert.throws(() => summarizeRuling(plan, [{ ...all[0], round: 3 }]), /Unexpected worker/);
});

test('compact reports retain every parity gate and timing without the diagnostic payload', () => {
  const all = reports();
  all[2].programInputs = [{ files: ['different.ts'] }];
  const compact = all.map(compactRulingReport);
  assert.equal(compact[2].programInputs, undefined);
  const expected = summarizeRuling(plan, all);
  const actual = summarizeRuling(plan, compact);
  delete expected.generated;
  delete actual.generated;
  assert.deepEqual(actual, expected);
  assert.deepEqual(actual.projects[0].mismatches[0].fields, ['programInputs']);
});
