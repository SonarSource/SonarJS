// sum.test.js
const vitest = require('@fast-check/vitest');
const { describe, expect, it } = require('@fast-check/vitest');

describe('@fast-check vitest test cases', () => {
  it('no assertion', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    alert('msg');
  });
  
  it('expect', () => { // Compliant
    expect(1).toEqual(2);
  });

  it('@fast-check/vitest.expect', () => { // Compliant
    vitest.expect(1).toEqual(2);
  });

  it('transitive assertion', () => { // Compliant
    check();
  });

  function check() {
    expect(1).toEqual(2);
  }
});

describe.concurrent('@fast-check vitest concurrent test cases', () => {
  it('recognizes global expect as an assertion', async ({ expect }) => {
    expect(5).toEqual(5);
  });
});
