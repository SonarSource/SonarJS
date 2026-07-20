import assert from 'node:assert/strict';
import test from 'node:test';

test.it('runs an assertion', () => {
  assert.strictEqual(1, 1); // Compliant
});

assert.strictEqual(1, 1); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

const nodeTest = require('node:test');

nodeTest.it('runs an assertion', () => {
  assert.strictEqual(1, 1); // Compliant
});

assert.strictEqual(1, 1); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
