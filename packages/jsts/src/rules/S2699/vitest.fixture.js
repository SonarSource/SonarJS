// sum.test.js
const vitest = require('vitest');
const { describe, expect, it, expectTypeOf, assertType } = require('vitest');

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

  it('expectTypeOf works properly', () => {
    vitest.expectTypeOf(it).toBeFunction()
  });

  it('destructured expectTypeOf works properly', () => {
    expectTypeOf(it).toBeFunction()
  });

  it('assertType works properly', () => {
    assertType(mount({ name: 42 }));
  });

  function check() {
    expect(1).toEqual(2);
  }
});

describe.concurrent('vitest concurrent test cases', () => {
  it('recognizes global expect as an assertion', async ({ expect }) => {
    expect(5).toEqual(5);
  });
});
