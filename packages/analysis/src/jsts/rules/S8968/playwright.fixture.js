import { test, expect, test as pwTest } from '@playwright/test';

test('reorders columns', async ({ page }) => {
  if (readOnlyMode) {
    return; // Noncompliant [[qf1]] {{Call `test.skip(condition)` instead of returning early.}}
  }
  await page.click('#reorder');
  await expect(page.locator('.column')).toHaveText(['a', 'b']);
});
// fix@qf1 {{Replace with `test.skip(condition)`.}}
// del@qf1@+1
// del@qf1
// edit@qf1@-1 {{  test.skip(readOnlyMode);}}

test('reorders columns', async ({ page }) => {
  test.skip(readOnlyMode, 'Reordering is disabled in read-only mode'); // Compliant
  await page.click('#reorder');
  await expect(page.locator('.column')).toHaveText(['a', 'b']);
});

// Playwright's 3-argument form: `test(title, options, fn)`.
test('reorders columns', { tag: '@slow' }, async ({ page }) => {
  if (readOnlyMode) {
    return; // Noncompliant [[qf2]] {{Call `test.skip(condition)` instead of returning early.}}
  }
  await page.click('#reorder');
  await expect(page.locator('.column')).toHaveText(['a', 'b']);
});
// fix@qf2 {{Replace with `test.skip(condition)`.}}
// del@qf2@+1
// del@qf2
// edit@qf2@-1 {{  test.skip(readOnlyMode);}}

// An aliased import combined with `.only` is still recognized as a test case.
pwTest.only('reorders columns and focuses on this one', async ({ page }) => {
  if (readOnlyMode) {
    return; // Noncompliant [[qf3]] {{Call `test.skip(condition)` instead of returning early.}}
  }
  await page.click('#reorder');
  await expect(page.locator('.column')).toHaveText(['a', 'b']);
});
// fix@qf3 {{Replace with `test.skip(condition)`.}}
// del@qf3@+1
// del@qf3
// edit@qf3@-1 {{  pwTest.skip(readOnlyMode);}}
