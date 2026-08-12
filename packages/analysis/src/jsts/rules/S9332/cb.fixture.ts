import { test, expect } from '@playwright/test';

test('compliant waits', async ({ page }): Promise<void> => {
  await page.goto('/dashboard');
  await page.waitForLoadState('load');
  await page.waitForLoadState('domcontentloaded');
  await page.goto('/dashboard', { waitUntil: 'load' });
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'load' });
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await page.goForward();
  await page.setContent('<h1>Hi</h1>', { waitUntil: 'load' });
  await page.waitForURL('**/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});

test('waitForLoadState networkidle', async ({ page }): Promise<void> => {
  await page.waitForLoadState('networkidle'); // Noncompliant {{Replace this "networkidle" wait with a web-first assertion or a specific readiness condition.}}
  //                          ^^^^^^^^^^^^^
});

test('goto waitUntil networkidle', async ({ page }): Promise<void> => {
  await page.goto('/dashboard', { waitUntil: 'networkidle' }); // Noncompliant {{Replace this "networkidle" wait with a web-first assertion or a specific readiness condition.}}
  //                                         ^^^^^^^^^^^^^
});

test('reload waitUntil networkidle', async ({ page }): Promise<void> => {
  await page.reload({ waitUntil: 'networkidle' }); // Noncompliant {{Replace this "networkidle" wait with a web-first assertion or a specific readiness condition.}}
  //                             ^^^^^^^^^^^^^
});

test('goBack waitUntil networkidle', async ({ page }): Promise<void> => {
  await page.goBack({ waitUntil: 'networkidle' }); // Noncompliant {{Replace this "networkidle" wait with a web-first assertion or a specific readiness condition.}}
  //                             ^^^^^^^^^^^^^
});

test('goForward waitUntil networkidle', async ({ page }): Promise<void> => {
  await page.goForward({ waitUntil: 'networkidle' }); // Noncompliant {{Replace this "networkidle" wait with a web-first assertion or a specific readiness condition.}}
  //                                ^^^^^^^^^^^^^
});

test('setContent waitUntil networkidle', async ({ page }): Promise<void> => {
  await page.setContent('<h1>Hi</h1>', { waitUntil: 'networkidle' }); // Noncompliant {{Replace this "networkidle" wait with a web-first assertion or a specific readiness condition.}}
  //                                                ^^^^^^^^^^^^^
});

test('waitForURL waitUntil networkidle', async ({ page }): Promise<void> => {
  await page.waitForURL('**/dashboard', { waitUntil: 'networkidle' }); // Noncompliant {{Replace this "networkidle" wait with a web-first assertion or a specific readiness condition.}}
  //                                                 ^^^^^^^^^^^^^
});

test('frame waitForLoadState networkidle', async ({ page }): Promise<void> => {
  const frame = page.frames()[0];
  await frame.waitForLoadState('networkidle'); // Noncompliant {{Replace this "networkidle" wait with a web-first assertion or a specific readiness condition.}}
  //                           ^^^^^^^^^^^^^
});

test('options object via variable', async ({ page }): Promise<void> => {
  const options = { waitUntil: 'networkidle' as const }; // Noncompliant {{Replace this "networkidle" wait with a web-first assertion or a specific readiness condition.}}
  //                           ^^^^^^^^^^^^^
  await page.goto('/dashboard', options);
});

test('waitForLoadState state via variable with as const', async ({ page }): Promise<void> => {
  const state = 'networkidle' as const; // Noncompliant {{Replace this "networkidle" wait with a web-first assertion or a specific readiness condition.}}
  //            ^^^^^^^^^^^^^
  await page.waitForLoadState(state);
});

test('waitUntil value via variable with as const', async ({ page }): Promise<void> => {
  const waitUntilValue = 'networkidle' as const; // Noncompliant {{Replace this "networkidle" wait with a web-first assertion or a specific readiness condition.}}
  //                     ^^^^^^^^^^^^^
  await page.goto('/dashboard', { waitUntil: waitUntilValue });
});

test('unrelated networkidle strings', async ({ page }): Promise<void> => {
  const label = 'networkidle';
  void label;
  await page.goto('/dashboard', { timeout: 5000 });
  // Puppeteer-style values are out of scope
  await page.goto('/dashboard', { waitUntil: 'networkidle2' });
});
