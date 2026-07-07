const { test } = require('node:test');
const assert = require('assert');
const strictAssert = require('node:assert/strict');
const { expectEquals } = require('jest');
const { ok } = require('assert');
const { equal, deepEqual } = require('assert/strict');

describe('global assert', () => {
  test('node:test with node:assert/strict', () => { // Compliant
    strictAssert.equal(actual, expected);
  });

  it('should recognize assert', () => { // Compliant
    expectEquals(10);
    assert(4);
  });

  it('should recognize assert.XXX methods', () => {  // Compliant
    assert.deepStrictEqual({ a: 1 }, { a: '1' });
  });

  it('should recognize methods from assert', () => {  // Compliant
    ok(true);
  });

  it('should recognize methods from node:assert/strict', () => {  // Compliant
    strictAssert.rejects(async () => runAsync());
    strictAssert.doesNotThrow(() => run());
  });

  it('should recognize destructured methods from assert/strict', () => {  // Compliant
    equal(actual, expected);
    deepEqual(items, []);
  });

  it('should recognize issue', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    const x = 10;
  });
});
