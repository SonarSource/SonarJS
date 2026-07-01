import test from 'node:test';
import assert from 'node:assert/strict';

test('reorders columns', t => {
  if (readOnlyMode) {
    return; // Noncompliant {{Call `t.skip()` before returning early.}}
  }
  db.reorderColumns();
  assert.deepEqual(db.columns, ['a', 'b']);
});

test('reorders columns', t => {
  if (readOnlyMode) {
    t.skip('Reordering is disabled in read-only mode'); // Compliant
    return;
  }
  db.reorderColumns();
  assert.deepEqual(db.columns, ['a', 'b']);
});

// node:test's static 3-argument form: `test(name, { skip: cond }, fn)`.
test('reorders columns', { skip: readOnlyMode }, t => {
  db.reorderColumns(); // Compliant, the guard-return shape is absent here
  assert.deepEqual(db.columns, ['a', 'b']);
});
