import test from 'node:test';
import assert from 'node:assert/strict';

test('reorders columns', t => {
  if (readOnlyMode) {
    return; // Noncompliant {{Call the test context's `skip()` before returning early.}}
  }
  db.reorderColumns();
  assert.deepEqual(db.columns, ['a', 'b']);
});

// The message must not assume the context parameter is named `t`.
test('reorders columns', context => {
  if (readOnlyMode) {
    return; // Noncompliant {{Call the test context's `skip()` before returning early.}}
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
