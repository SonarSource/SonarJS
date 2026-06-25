const { describe, it, expect, beforeEach, expectTypeOf } = require('vitest');

// flagged: vitest assertion at module top level. The inner `expect()` and
// the outer `.toBe()` are both detected, but the statement is reported once.
expect(value).toBe(1); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

// flagged: `expect.soft` / `expect.poll` / `expect.element` / `expectTypeOf` are
// real assertion entry points, so they are still detected at module top level.
expect.soft(value).toBe(1); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
expect.element(value).toBeVisible(); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
expectTypeOf(value).toBeString(); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

// NOT flagged: `expect.*` configuration / setup methods are not assertions
// (they register matchers or serializers), so they are never reported.
expect.extend({ toBeWithinRange() {} }); // Compliant
expect.addSnapshotSerializer({ serialize() {} }); // Compliant
expect.addEqualityTesters([() => true]); // Compliant

describe('vitest', () => {
  // flagged: directly in the describe body
  expect(value).toBe(1); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

  it('asserts', () => {
    expect(value).toBe(1); // Compliant
  });

  beforeEach(() => {
    expect(value).toBe(0); // Compliant
  });
});
