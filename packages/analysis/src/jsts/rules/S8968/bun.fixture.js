import { test, expect } from 'bun:test';

test('reorders columns', () => {
  if (readOnlyMode) {
    return; // Noncompliant {{Move the condition to `test.skipIf()` instead of returning early.}}
  }
  db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});

// Bun has no in-body skip; the fix moves the condition to the declaration.
// The chained call below is invisible to this rule (see edge-cases fixture).
test.skipIf(readOnlyMode)('reorders columns', () => {
  db.reorderColumns(); // Compliant
  expect(db.columns).toEqual(['a', 'b']);
});
