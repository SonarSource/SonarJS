import test from 'node:test';
import assert, { deepStrictEqual } from 'node:assert';
import strictAssert, { equal, deepEqual, match } from 'node:assert/strict';
import * as nodeStrictAssert from 'node:assert/strict';
import assertStrict from 'assert/strict';

describe('global assert', () => {
  test('node:test with node:assert/strict', () => { // Compliant
    strictAssert.equal(actual, expected);
  });

  it('should recognize assert', () => { // Compliant
    assert(4);
  });

  it('should recognize assert.XXX methods', () => {  // Compliant
    deepStrictEqual({ a: 1 }, { a: '1' });
  });

  it('should recognize default import from node:assert/strict', () => {  // Compliant
    strictAssert.equal(actual, expected);
    strictAssert.deepEqual(items, []);
    strictAssert.match(message, /ok/);
  });

  it('should recognize namespace import from node:assert/strict', () => {  // Compliant
    nodeStrictAssert.ok(value);
    nodeStrictAssert.notEqual(actual, unexpected);
    nodeStrictAssert.doesNotMatch(message, /error/);
  });

  it('should recognize named imports from node:assert/strict', () => {  // Compliant
    equal(actual, expected);
    deepEqual(items, []);
    match(message, /ok/);
  });

  it('should recognize default import from assert/strict', () => {  // Compliant
    assertStrict.strictEqual(actual, expected);
    assertStrict.throws(() => run());
  });

  it('should recognize issue', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    const x = 10;
  });
});
