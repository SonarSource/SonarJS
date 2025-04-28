import assert, { deepStrictEqual } from "assert";
import vitest from 'vitest';

describe('global assert', () => {
  it('should recognize assert', () => { // Compliant
    assert(4);
  });

  it('should recognize assert.XXX methods', () => {  // Compliant
    deepStrictEqual({ a: 1 }, { a: '1' });
  });

  it('should recognize issue', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    const x = 10;
  });
});
