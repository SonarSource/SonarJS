describe('playwright assertions', () => {
  it('recognizes expect on locators', () => { // Compliant
    expect(page.locator('h1')).toHaveText('Hello');
  });

  it('recognizes expect with negation', () => { // Compliant
    expect(page).not.toHaveURL('/login');
  });

  it('should recognize issue', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    page.goto('/');
  });
});
