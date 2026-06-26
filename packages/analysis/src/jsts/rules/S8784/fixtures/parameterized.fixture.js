'use strict';

// Parameterized `.each` forms (`describe.each(table)(name, fn)`, `it.each`,
// `test.each`) are first-class Jest/Vitest test structure. The curried call is
// recognised so both gates work: the file counts as a test file, and an assertion
// directly in a `describe.each` body is suite-body misplacement.
const assert = require('node:assert');

// The file's only markers are `.each` forms, so it is still a test file: this
// script-capable top-level assertion is therefore misplaced.
assert.strictEqual(a, b); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

describe.each([1, 2])('suite %s', value => {
  // directly in the `describe.each` body — runs at suite-collection time
  assert.strictEqual(value, value); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

  test('runs a case', () => {
    assert.strictEqual(value, value); // Compliant
  });
});

// Parameterized test cases: assertions inside the test body are fine.
it.each([1, 2])('handles %s', value => {
  assert.strictEqual(value, value); // Compliant
});

test.each([1, 2])('handles %s', value => {
  assert.strictEqual(value, value); // Compliant
});