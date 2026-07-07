import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('node:assert/strict', () => {
  it('should recognize assert/strict assertions', () => { // Compliant
    assert.strictEqual(1, 1);
  });

  it('should raise without assertions', () => { // Noncompliant
    const x = 1 + 2;
  });
});
