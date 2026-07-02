// if/else: not a guard clause, both branches are meant to run.
it('handles both modes', () => {
  if (readOnlyMode) {
    return;
  } else {
    db.reorderColumns();
  }
  expect(db.columns).toEqual(['a', 'b']);
});

// Unconditional return with nothing after it: nothing is being skipped over.
it('does nothing special', () => {
  if (readOnlyMode) {
    return;
  }
});

// Return with a value: usually a promise/result, not a skip attempt.
it('returns a promise', () => {
  if (readOnlyMode) {
    return Promise.resolve();
  }
  db.reorderColumns();
});

// Return inside a nested callback: not a top-level statement of the test body.
it('processes each row', () => {
  rows.forEach(row => {
    if (row.ignored) {
      return;
    }
    process(row);
  });
  expect(db.columns).toEqual(['a', 'b']);
});

// Hooks are out of scope, only it/test callbacks are checked.
beforeEach(function () {
  if (readOnlyMode) {
    return;
  }
  db.reset();
});

// Only the first of several sequential guard clauses is checked.
it('checks two prerequisites', () => {
  if (readOnlyMode) {
    return; // Noncompliant {{Call `this.skip()` instead of returning early.}}
  }
  if (!db.isConnected()) {
    return;
  }
  db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});

// The `specify` alias is recognized like `it`/`test`.
specify('reorders columns', function () {
  if (readOnlyMode) {
    return; // Noncompliant {{Call `this.skip()` instead of returning early.}}
  }
  db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});

// A test already marked `.skip` can never be misreported as "passed".
it.skip('reorders columns', function () {
  if (readOnlyMode) {
    return;
  }
  db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});

// `.only` still runs normally, so the anti-pattern still applies.
it.only('reorders columns', function () {
  if (readOnlyMode) {
    return; // Noncompliant {{Call `this.skip()` instead of returning early.}}
  }
  db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});

// Chained `.skipIf(...)(...)` declarations are not recognized as test cases at all.
it.skipIf(readOnlyMode)('reorders columns', () => {
  if (somethingElse) {
    return;
  }
  db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});
