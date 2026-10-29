import assert from 'node:assert/strict';
import { test } from 'node:test';
import { diffRulingReports } from './ruling-diff.mjs';

test('ruling differences retain duplicate findings, rich-only changes and selected programs', () => {
  const before = {
    valid: true,
    timings: { analysisMs: 1 },
    issueCount: 3,
    issues: { S1: { 'file.ts': [1, 1, 2] } },
    files: ['file.ts'],
    sourceHashes: {},
    activeRules: {},
    diagnostics: { 'file.ts': { issues: [{ message: 'old' }] } },
    programInputs: [
      { kind: 'configured', tsconfig: 'tsconfig.json', compilerOptions: {}, files: ['file.ts'] },
    ],
  };
  const after = {
    ...before,
    issues: { S1: { 'file.ts': [1, 2, 3] } },
    diagnostics: { 'file.ts': { issues: [{ message: 'new' }] } },
    programInputs: [{ kind: 'orphan', compilerOptions: {}, files: ['file.ts'] }],
  };
  const difference = diffRulingReports(before, after);
  assert.equal(difference.findingDelta, 0);
  assert.equal(difference.rules[0].added, 1);
  assert.equal(difference.rules[0].removed, 1);
  assert.deepEqual(difference.diagnosticFiles, ['file.ts']);
  assert.deepEqual(difference.selectionChangedFiles, ['file.ts']);
  const richOnly = diffRulingReports(before, { ...before, diagnostics: after.diagnostics });
  assert.equal(richOnly.issueLinesMatch, true);
  assert.equal(richOnly.diagnosticsMatch, false);
  assert.deepEqual(richOnly.rules, []);
});

test('aborted pipelines are unavailable comparisons rather than zero findings', () => {
  assert.equal(diffRulingReports({ timings: {} }, { timings: { analysisMs: 1 } }).available, false);
});
