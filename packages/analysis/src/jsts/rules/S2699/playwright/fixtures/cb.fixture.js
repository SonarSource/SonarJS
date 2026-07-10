describe('playwright assertions', () => {
  it('recognizes expect on locators', () => { // Compliant
    expect(page.locator('h1')).toHaveText('Hello');
  });

  it('recognizes expect with negation', () => { // Compliant
    expect(page).not.toHaveURL('/login');
  });

  it('recognizes expect.poll with a matcher', async () => { // Compliant
    await expect.poll(() => 'ready').toBe('ready');
  });

  test('recognizes test()', () => { // Compliant
    expect(page.locator('h1')).toHaveText('Hello');
  });

  test('bare expect.poll is not an assertion', async () => { // Noncompliant {{Add at least one assertion to this test case.}}
    await expect.poll(() => 'ready');
  });

  it('should recognize issue', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    page.goto('/');
  });

  test.only('should recognize issue in test.only()', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    page.goto('/');
  });
});
