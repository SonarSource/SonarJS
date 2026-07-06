import { test, expect } from 'bun:test';

test('reorders columns', () => {
  if (readOnlyMode) {
    return; // Noncompliant [[qf1]] {{Move the condition to `test.skipIf()` instead of returning early.}}
  }
  db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});
// fix@qf1 {{Move the condition to `test.skipIf()`.}}
// del@qf1@+1
// del@qf1
// del@qf1@-1
// edit@qf1@-2 {{test.skipIf(readOnlyMode)('reorders columns', () => {}}

// Bun has no in-body skip; the fix moves the condition to the declaration.
// The chained call below is invisible to this rule (see edge-cases fixture).
test.skipIf(readOnlyMode)('reorders columns', () => {
  db.reorderColumns(); // Compliant
  expect(db.columns).toEqual(['a', 'b']);
});
