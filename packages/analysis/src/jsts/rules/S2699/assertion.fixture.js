const vitest = require('vitest');

describe('global expect', () => {
  it('is recognized as an assertion', () => { // Compliant
    expect(5).toEqual(5);
  });
});

describe('global non-supported symbol', () => {
  it('is not recognized as an assertion', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    foo(5).toEqual(5);
  });
});

describe.concurrent('expect called inside describe.concurrent scope', () => {
  it('is recognized as an assertion', async ({ expect }) => { // Compliant
    expect(5).toEqual(5);
  });
});
