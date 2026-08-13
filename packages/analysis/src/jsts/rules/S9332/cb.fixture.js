import { test, expect } from '@playwright/test';

test('compliant waits', async ({ page }) => {
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

test('waitForLoadState networkidle', async ({ page }) => {
  await page.waitForLoadState('networkidle'); // Noncompliant {{Replace this "networkidle" wait with a web-first assertion or a specific readiness condition.}}
  //                          ^^^^^^^^^^^^^
});

test('goto waitUntil networkidle', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'networkidle' }); // Noncompliant {{Replace this "networkidle" wait with a web-first assertion or a specific readiness condition.}}
  //                                         ^^^^^^^^^^^^^
});

test('reload waitUntil networkidle', async ({ page }) => {
  await page.reload({ waitUntil: 'networkidle' }); // Noncompliant {{Replace this "networkidle" wait with a web-first assertion or a specific readiness condition.}}
  //                             ^^^^^^^^^^^^^
});

test('goBack waitUntil networkidle', async ({ page }) => {
  await page.goBack({ waitUntil: 'networkidle' }); // Noncompliant {{Replace this "networkidle" wait with a web-first assertion or a specific readiness condition.}}
  //                             ^^^^^^^^^^^^^
});

test('goForward waitUntil networkidle', async ({ page }) => {
  await page.goForward({ waitUntil: 'networkidle' }); // Noncompliant {{Replace this "networkidle" wait with a web-first assertion or a specific readiness condition.}}
  //                                ^^^^^^^^^^^^^
});

test('setContent waitUntil networkidle', async ({ page }) => {
  await page.setContent('<h1>Hi</h1>', { waitUntil: 'networkidle' }); // Noncompliant {{Replace this "networkidle" wait with a web-first assertion or a specific readiness condition.}}
  //                                                ^^^^^^^^^^^^^
});

test('waitForURL waitUntil networkidle', async ({ page }) => {
  await page.waitForURL('**/dashboard', { waitUntil: 'networkidle' }); // Noncompliant {{Replace this "networkidle" wait with a web-first assertion or a specific readiness condition.}}
  //                                                 ^^^^^^^^^^^^^
});

test('frame waitForLoadState networkidle', async ({ page }) => {
  const frame = page.frames()[0];
  await frame.waitForLoadState('networkidle'); // Noncompliant {{Replace this "networkidle" wait with a web-first assertion or a specific readiness condition.}}
  //                           ^^^^^^^^^^^^^
});

test('options object via variable', async ({ page }) => {
  const options = { waitUntil: 'networkidle' }; // Noncompliant {{Replace this "networkidle" wait with a web-first assertion or a specific readiness condition.}}
  //                           ^^^^^^^^^^^^^
  await page.goto('/dashboard', options);
});

test('waitForLoadState state via variable', async ({ page }) => {
  const state = 'networkidle'; // Noncompliant {{Replace this "networkidle" wait with a web-first assertion or a specific readiness condition.}}
  //            ^^^^^^^^^^^^^
  await page.waitForLoadState(state);
});

test('waitUntil value via variable', async ({ page }) => {
  const waitUntilValue = 'networkidle'; // Noncompliant {{Replace this "networkidle" wait with a web-first assertion or a specific readiness condition.}}
  //                     ^^^^^^^^^^^^^
  await page.goto('/dashboard', { waitUntil: waitUntilValue });
});

test('unrelated networkidle strings', async ({ page }) => {
  const label = 'networkidle';
  void label;
  await page.goto('/dashboard', { timeout: 5000 });
  // Puppeteer-style values are out of scope
  await page.goto('/dashboard', { waitUntil: 'networkidle2' });
});
