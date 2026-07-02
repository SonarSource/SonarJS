it('reorders columns', function () {
  if (readOnlyMode) {
    return; // Noncompliant {{Call `this.skip()` instead of returning early.}}
  }
  db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});

it('reorders columns', function () {
  if (readOnlyMode) {
    this.skip(); // Compliant
  }
  db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});
