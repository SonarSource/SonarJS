import { test, expect } from '@playwright/test';

describe('playwright assertions', () => {
  it('recognizes expect on locators', () => { // Compliant
    expect(page.locator('h1')).toHaveText('Hello');
  });

  it('recognizes expect with negation', () => { // Compliant
    expect(page).not.toHaveURL('/login');
  });

  test('recognizes test()', () => { // Compliant
    expect(page.locator('h1')).toHaveText('Hello');
  });

  test('recognizes test.expect()', async ({ page }) => { // Compliant
    await test.expect(page.locator('h1')).toHaveText('Hello');
  });

  test('recognizes test.expect.soft()', async ({ page }) => { // Compliant
    await test.expect.soft(page.locator('h1')).toHaveText('Hello');
  });

  test('recognizes test.expect.poll()', async () => { // Compliant
    await test.expect.poll(() => 1).toBe(1);
  });

  test('recognizes expect.soft() from imported expect', async ({ page }) => { // Compliant
    await expect.soft(page.locator('h1')).toHaveText('Hello');
  });

  test('recognizes expect.poll() from imported expect', async () => { // Compliant
    await expect.poll(() => 1).toBe(1);
  });

  it('should recognize issue', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    page.goto('/');
  });

  test.only('should recognize issue in test.only()', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    page.goto('/');
  });
});
