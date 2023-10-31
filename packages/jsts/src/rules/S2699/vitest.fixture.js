// sum.test.js
const vitest = require('vitest');
const { describe, expect, it } = require('vitest');

describe('vitest test cases', () => {
  it('no assertion', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    alert('msg');
  });
  
  it('expect', () => { // Compliant
    expect(1).toEqual(2);
  });

  it('vitest.expect', () => { // Compliant
    vitest.expect(1).toEqual(2);
  });

  it('transitive assertion', () => { // Compliant
    check();
  });

  function check() {
    expect(1).toEqual(2);
  }
});
