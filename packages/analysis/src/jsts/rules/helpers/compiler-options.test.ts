import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isStrictNullChecksEnabled } from './compiler-options.js';

describe('isStrictNullChecksEnabled', () => {
  it('uses the TypeScript 6 default when strict flags are absent', () => {
    assert.equal(isStrictNullChecksEnabled({}), true);
  });

  it('honors strict and explicit strictNullChecks overrides', () => {
    assert.equal(isStrictNullChecksEnabled({ strict: true }), true);
    assert.equal(isStrictNullChecksEnabled({ strict: false }), false);
    assert.equal(isStrictNullChecksEnabled({ strictNullChecks: false }), false);
    assert.equal(isStrictNullChecksEnabled({ strict: true, strictNullChecks: false }), false);
    assert.equal(isStrictNullChecksEnabled({ strict: false, strictNullChecks: true }), true);
  });
});
