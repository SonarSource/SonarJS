import { it, expect } from 'vitest';

it('reorders columns', async () => {
  if (readOnlyMode) {
    return; // Noncompliant {{Call the test context's `skip()` instead of returning early.}}
  }
  await db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});

it('reorders columns', async ({ skip }) => {
  if (readOnlyMode) {
    skip(); // Compliant
  }
  await db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});
