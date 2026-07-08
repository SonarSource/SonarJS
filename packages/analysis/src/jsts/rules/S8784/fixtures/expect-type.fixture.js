const { describe, it, expect } = require('vitest');
const { expectTypeOf } = require('expect-type');

// NOT flagged: expectTypeOf from the standalone `expect-type` package is a
// compile-time type check with no runtime behaviour. It must not be treated
// as a misplaced assertion even when a runner-bound library (vitest) is also
// present and the rule is active.
expectTypeOf(value).toEqualTypeOf(); // Compliant

// runner-bound vitest assertions are still flagged at the top level
expect(value).toBe(1); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

describe('suite', () => {
  expectTypeOf(value).toEqualTypeOf(); // Compliant

  it('test', () => {
    expectTypeOf(value).toEqualTypeOf(); // Compliant
    expect(value).toBe(1); // Compliant
  });
});
