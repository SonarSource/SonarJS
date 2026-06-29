'use strict';

// Playwright "extended fixtures" pattern: `test` comes from a local module, so it
// does NOT resolve to the `@playwright/test` FQN. `test.describe` is then only
// recognised by name — isTestStructureConstruct must use the same FQN-then-name
// resolution as isPlaywrightDescribe, otherwise the file would not be seen as a
// test file and the top-level assertion below would be missed.
const assert = require('node:assert');
const { test } = require('./fixtures');

// flagged: the file has test structure (the `test.describe` below), so this
// top-level script-capable assertion is misplaced.
assert.strictEqual(a, b); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

test.describe('a suite', () => {
  // flagged: directly in the suite body
  assert.strictEqual(a, b); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

  test('a test', () => {
    assert.strictEqual(a, b); // Compliant
  });
});