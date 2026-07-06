import test from 'node:test';
import assert from 'node:assert/strict';

test('reorders columns', t => {
  if (readOnlyMode) {
    return; // Noncompliant [[qf1]] {{Call the test context's `skip()` before returning early.}}
  }
  db.reorderColumns();
  assert.deepEqual(db.columns, ['a', 'b']);
});
// fix@qf1 {{Call the test context's `skip()` before returning.}}
// del@qf1@+1
// del@qf1
// edit@qf1@-1 {{  if (readOnlyMode) { t.skip(); return; }}}

// The message must not assume the context parameter is named `t`.
test('reorders columns', context => {
  if (readOnlyMode) {
    return; // Noncompliant [[qf2]] {{Call the test context's `skip()` before returning early.}}
  }
  db.reorderColumns();
  assert.deepEqual(db.columns, ['a', 'b']);
});
// fix@qf2 {{Call the test context's `skip()` before returning.}}
// del@qf2@+1
// del@qf2
// edit@qf2@-1 {{  if (readOnlyMode) { context.skip(); return; }}}

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
