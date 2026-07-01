import { it, expect, type TestContext } from 'vitest';

interface Db {
  reorderColumns(): Promise<void>;
  columns: string[];
}

declare const db: Db;
declare const readOnlyMode: boolean;

it('reorders columns', async (): Promise<void> => {
  if (readOnlyMode) {
    return; // Noncompliant {{Call the test context's `skip()` instead of returning early.}}
  }
  await db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});

it('reorders columns', async ({ skip }: TestContext): Promise<void> => {
  if (readOnlyMode) {
    skip(); // Compliant
  }
  await db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});
