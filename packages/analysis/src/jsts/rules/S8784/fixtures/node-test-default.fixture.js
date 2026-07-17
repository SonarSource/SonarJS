import test from 'node:test';
import assert from 'node:assert/strict';

test('contains an assertion', () => {
  assert.strictEqual(1, 1); // Compliant
});

assert.strictEqual(1, 1); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
