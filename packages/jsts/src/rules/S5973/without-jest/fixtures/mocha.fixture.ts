describe('api.foo()', function () {
  this.retries(2); // Noncompliant

  it('should return 42', function () {
    this.retries(5); // Noncompliant
  });
  it('should return 42', () => {
    this.retries(5); // Noncompliant - FP, because Mocha callbacks with arrow functions lose context. But we accept this.
  });
});
