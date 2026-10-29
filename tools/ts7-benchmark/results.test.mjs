import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  compareResults,
  distribution,
  fingerprint,
  normalizeDiagnostics,
  parityPassed,
  summarizeComparisons,
} from './results.mjs';

const issue = {
  filePath: '/project/index.ts',
  ruleId: 'S1',
  message: 'message',
  line: 1,
  column: 2,
  secondaryLocations: [{ line: 3, column: 0, message: 'secondary' }],
  quickFixes: [{ message: 'fix', edits: [{ loc: { line: 1, column: 2 }, text: 'replacement' }] }],
};
const result = () => ({
  files: ['index.ts'],
  issues: { S1: { 'index.ts': [1, 1] } },
  sourceHashes: { 'index.ts': 'hash' },
  activeRules: { 'index.ts': ['S1'] },
  programInputs: [{ rootCount: 1, compilerOptions: {} }],
  diagnostics: {
    'index.ts': normalizeDiagnostics(
      { issues: [issue, issue], suppressedIssues: [{ ...issue, resolutionComment: 'accepted' }] },
      '/project',
    ),
  },
});

test('richer parity preserves duplicates and checks columns, messages, secondary locations, fixes and suppressions', () => {
  const reference = result();
  assert.ok(parityPassed(compareResults(reference, result())));
  assert.equal(reference.diagnostics['index.ts'].issues[0].filePath, 'index.ts');
  for (const mutate of [
    value => value.issues.pop(),
    value => value.issues[0].column++,
    value => (value.issues[0].message = 'different'),
    value => value.issues[0].secondaryLocations[0].line++,
    value => (value.issues[0].quickFixes[0].edits[0].text = 'different'),
    value => (value.suppressedIssues[0].resolutionComment = 'different'),
  ]) {
    const candidate = structuredClone(reference);
    mutate(candidate.diagnostics['index.ts']);
    const comparison = compareResults(reference, candidate);
    assert.ok(comparison.issueLinesMatch);
    assert.equal(comparison.diagnosticsMatch, false);
    assert.equal(comparison.diagnosticDifferences.length, 1);
    assert.equal(parityPassed(comparison), false);
    assert.notEqual(fingerprint(reference), fingerprint(candidate));
  }
});

test('object order is irrelevant, legacy reports cannot pass richer parity, and even medians are correct', () => {
  const candidate = result();
  candidate.programInputs[0].compilerOptions = { strict: true, target: 'esnext' };
  const reference = result();
  reference.programInputs[0].compilerOptions = { target: 'esnext', strict: true };
  assert.equal(fingerprint(candidate), fingerprint(reference));
  delete candidate.diagnostics;
  assert.equal(compareResults(reference, candidate).diagnosticsMatch, false);
  assert.deepEqual(distribution([4, 1, 3, 2]), {
    count: 4,
    median: 2.5,
    min: 1,
    max: 4,
    values: [4, 1, 3, 2],
  });
  assert.equal(distribution([]), null);
});

test('overall parity fields include every backend even when the first comparison passes', () => {
  const reference = result();
  const changed = result();
  changed.diagnostics['index.ts'].issues[0].message = 'different';
  const summary = summarizeComparisons({
    native: compareResults(reference, reference),
    wasm: compareResults(reference, changed),
  });
  assert.equal(summary.issueLinesMatch, true);
  assert.equal(summary.diagnosticsMatch, false);
  assert.equal(summary.diagnosticDifferences[0].backend, 'wasm');
  assert.equal(parityPassed(summary), false);
});
