const vitest = require("vitest");

describe('global assert', () => {
  it('should recognize assert', () => { // Compliant
    assert(4);
  });

  it('should recognize issue', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    const x = 10;
  });
});
