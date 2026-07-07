import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('node:assert/strict', () => {
  it('should recognize assert/strict assertions', () => { // Compliant
    assert.strictEqual(actual, expected);
  });

  it('should raise without assertions', () => { // Noncompliant
    const x = 1 + 2;
  });
});
