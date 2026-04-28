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

  it('should recognize issue', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    page.goto('/');
  });

  test.only('should recognize issue in test.only()', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    page.goto('/');
  });
});
