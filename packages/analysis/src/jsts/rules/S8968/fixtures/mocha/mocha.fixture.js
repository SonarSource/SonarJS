it('reorders columns', function () {
  if (readOnlyMode) {
    return; // Noncompliant [[qf1]] {{Call `this.skip()` instead of returning early.}}
  }
  db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});
// fix@qf1 {{Replace with `this.skip()`.}}
// del@qf1@+1
// del@qf1
// edit@qf1@-1 {{  if (readOnlyMode) { this.skip(); }}}

it('reorders columns', function () {
  if (readOnlyMode) {
    this.skip(); // Compliant
  }
  db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});
