import vitest from "vitest";
import {functionWithAssertion, functionWithoutAssertion, functionWithInnerAssertion} from "./a.js"

describe("tests", () => {
  it("should traverse functions with assertions", () => { // Compliant
    functionWithAssertion();
  });

  it("should traverse functions with inner assertions", () => { // Compliant
    functionWithInnerAssertion();
  });

  it("should traverse functions and identify missing assertions", () => { // Noncompliant {{Add at least one assertion to this test case.}}
    functionWithoutAssertion();
  });

  it("recognizes vitest.expect via the type-checker path", () => { // Compliant
    vitest.expect(1).toEqual(2);
  });

  // Stopgap: in the type-aware path, `expect.extend(...)` is a compile-time check on
  // its typed argument, so a typecheck test that only configures matchers is not
  // reported as assertion-less.
  it("treats expect.extend as a compile-time check under the type-checker", () => { // Compliant
    vitest.expect.extend({ toBeFoo: () => ({ pass: true, message: () => "" }) });
  });
});
