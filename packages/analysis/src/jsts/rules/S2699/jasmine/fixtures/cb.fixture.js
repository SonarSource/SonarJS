describe('jasmine assertions', () => {
  it('recognizes global expect', () => { // Compliant
    expect(1).toEqual(1);
  });

  it('recognizes global expectAsync', async () => { // Compliant
    await expectAsync(Promise.resolve(1)).toBeResolved();
  });

  it('should recognize issue', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    const value = 1;
  });
});
