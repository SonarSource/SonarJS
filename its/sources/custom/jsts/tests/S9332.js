test('opens the dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});

test('opens with waitUntil', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});

test('reloads', async ({ page }) => {
  await page.reload({ waitUntil: 'networkidle' });
});

test('compliant', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('load');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
