import vitest from "vitest";
import {functionWithAssertion, functionWithoutAssertion, functionWithInnerAssertion} from "./a.js"

describe("tests", () => {
  it("should traverse functions with assertions", () => { // Compliant
    functionWithAssertion();
  });

  // it("should traverse functions with inner assertions", () => { // Compliant
  //   functionWithInnerAssertion();
  // });

  it("should traverse functions and identify missing assertions", () => { // Noncompliant {{Add at least one assertion to this test case.}}
    functionWithoutAssertion();
  });
});
