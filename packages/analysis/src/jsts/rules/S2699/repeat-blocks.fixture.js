const vitest = require('vitest');
const assert = require('assert');

describe("should work", () => {
  it("should traverse", () => {
    withAssertion();
  });

  it("should traverse as well", () => {
    withAssertion();
  });

  it("should fail", () => { // Noncompliant {{Add at least one assertion to this test case.}}

  });
});

function withAssertion() {
  assert(true);
}
