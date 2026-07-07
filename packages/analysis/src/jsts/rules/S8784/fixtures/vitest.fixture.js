const { describe, it, expect, beforeEach, expectTypeOf, assertType } = require('vitest');

// flagged: vitest assertion at module top level. The inner `expect()` and
// the outer `.toBe()` are both detected, but the statement is reported once.
expect(value).toBe(1); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

// flagged: `expect.soft` / `expect.poll` / `expect.element` are runner-bound assertions.
expect.soft(value).toBe(1); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
expect.element(value).toBeVisible(); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

// NOT flagged: `expectTypeOf` and `assertType` are compile-time / type-level constructs.
// Vitest processes these files statically; they are never executed at runtime.
// Placing them outside a test() block is idiomatic in .test-d.ts type-test files.
expectTypeOf(value).toBeString(); // Compliant
assertType(value); // Compliant

// NOT flagged: `expect.*` configuration / setup methods are not assertions
// (they register matchers or serializers), so they are never reported.
expect.extend({ toBeWithinRange() {} }); // Compliant
expect.addSnapshotSerializer({ serialize() {} }); // Compliant
expect.addEqualityTesters([() => true]); // Compliant

describe('vitest', () => {
  // flagged: directly in the describe body
  expect(value).toBe(1); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

  // NOT flagged: type-level assertions are fine even in describe bodies
  expectTypeOf(value).toBeString(); // Compliant
  assertType(value); // Compliant

  it('asserts', () => {
    expect(value).toBe(1); // Compliant
  });

  beforeEach(() => {
    expect(value).toBe(0); // Compliant
  });
});
