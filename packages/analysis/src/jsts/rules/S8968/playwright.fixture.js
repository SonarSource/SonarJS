import { test, expect } from '@playwright/test';

test('reorders columns', async ({ page }) => {
  if (readOnlyMode) {
    return; // Noncompliant {{Call `test.skip(condition)` instead of returning early.}}
  }
  await page.click('#reorder');
  await expect(page.locator('.column')).toHaveText(['a', 'b']);
});

test('reorders columns', async ({ page }) => {
  test.skip(readOnlyMode, 'Reordering is disabled in read-only mode'); // Compliant
  await page.click('#reorder');
  await expect(page.locator('.column')).toHaveText(['a', 'b']);
});

// Playwright's 3-argument form: `test(title, options, fn)`.
test('reorders columns', { tag: '@slow' }, async ({ page }) => {
  if (readOnlyMode) {
    return; // Noncompliant {{Call `test.skip(condition)` instead of returning early.}}
  }
  await page.click('#reorder');
  await expect(page.locator('.column')).toHaveText(['a', 'b']);
});
