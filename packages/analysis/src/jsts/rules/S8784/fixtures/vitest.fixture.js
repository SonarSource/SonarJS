const { describe, it, expect, beforeEach } = require('vitest');

// flagged: vitest assertion at module top level. The inner `expect()` and
// the outer `.toBe()` are both detected, but the statement is reported once.
expect(value).toBe(1); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

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
