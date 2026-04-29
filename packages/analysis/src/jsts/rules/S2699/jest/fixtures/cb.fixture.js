describe('jest assertions', () => {
  it('recognizes global expect', () => { // Compliant
    expect(1 + 2).toBe(3);
  });

  it('recognizes expect with chained matchers', () => { // Compliant
    expect(value).not.toBeNull();
  });

  test('recognizes test()', () => { // Compliant
    expect(1 + 2).toBe(3);
  });

  it('should recognize issue', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    const value = 1;
  });

  test.only('should recognize issue in test.only()', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    const value = 1;
  });
});
