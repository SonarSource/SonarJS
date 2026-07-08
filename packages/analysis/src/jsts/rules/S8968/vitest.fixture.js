import { it, expect, it as vitestIt } from 'vitest';

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

// The `.sequential` modifier still runs the test, so the anti-pattern still applies.
it.sequential('reorders columns sequentially', async () => {
  if (readOnlyMode) {
    return; // Noncompliant {{Call the test context's `skip()` instead of returning early.}}
  }
  await db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});

// An aliased import combined with `.concurrent` is still recognized as a test case.
vitestIt.concurrent('reorders columns concurrently', async () => {
  if (readOnlyMode) {
    return; // Noncompliant {{Call the test context's `skip()` instead of returning early.}}
  }
  await db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});
