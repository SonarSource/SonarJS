const assert = require("assert");
const vitest = require("vitest");

describe('global assert', () => {
  it('should recognize assert', () => { // Compliant
    assert(4);
  });

  it('should recognize assert.XXX methods', () => {  // Compliant
    assert.deepStrictEqual({ a: 1 }, { a: '1' });
  });

  it('should recognize issue', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    const x = 10;
  });
});
