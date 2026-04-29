describe('jasmine assertions', () => {
  it('recognizes global expect', () => { // Compliant
    expect(1).toEqual(1);
  });

  it('should recognize issue', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    const value = 1;
  });
});
