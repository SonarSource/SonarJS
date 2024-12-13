describe('api.foo()', function () {
  this.retries(2); // Noncompliant {{Make your tests stable so that they pass on the first try, or remove the flaky ones.}}

  it('should return 42', function () {
    this.retries(5); // Noncompliant {{Make your tests stable so that they pass on the first try, or remove the flaky ones.}}
  });
  it('should return 42', () => {
    this.retries(5); // Noncompliant  {{Make your tests stable so that they pass on the first try, or remove the flaky ones.}} FP, because Mocha callbacks with arrow functions lose context. But we accept this.
  });
});
