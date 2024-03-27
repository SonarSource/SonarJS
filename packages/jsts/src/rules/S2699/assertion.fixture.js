const vitest = require('vitest');

describe('global expect', () => { // Compliant
  it('is recognized as an assertion', () => {
    expect(5).toEqual(5);
  });
});

describe('global non-supported symbol', () => { // Compliant
  it('is not recognized as an assertion', () => { // Noncompliant
    foo(5).toEqual(5);
  });
});

describe.concurrent('expect called inside describe.concurrent scope', () => { // Compliant
  it('is recognized as an assertion', async ({ expect }) => {
    expect(5).toEqual(5);
  });
});
