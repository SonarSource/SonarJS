// ===== Mocha =====

it('reorders columns', function () {
  if (readOnlyMode) {
    return; // Noncompliant {{Skip this test explicitly instead of returning early.}}
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

// ===== Vitest =====

it('reorders columns', async () => {
  if (readOnlyMode) {
    return; // Noncompliant {{Skip this test explicitly instead of returning early.}}
  }
  await db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});

it('reorders columns', async ({ skip }) => {
  if (readOnlyMode) {
    skip(); // Compliant
  }
  await db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});

// ===== Playwright =====

test('reorders columns', async ({ page }) => {
  if (readOnlyMode) {
    return; // Noncompliant {{Skip this test explicitly instead of returning early.}}
  }
  await page.click('#reorder');
  await expect(page.locator('.column')).toHaveText(['a', 'b']);
});

test('reorders columns', async ({ page }) => {
  test.skip(readOnlyMode, 'Reordering is disabled in read-only mode'); // Compliant
  await page.click('#reorder');
  await expect(page.locator('.column')).toHaveText(['a', 'b']);
});

// Playwright's 3-argument form: `test(title, options, fn)`.
test('reorders columns', { tag: '@slow' }, async ({ page }) => {
  if (readOnlyMode) {
    return; // Noncompliant {{Skip this test explicitly instead of returning early.}}
  }
  await page.click('#reorder');
  await expect(page.locator('.column')).toHaveText(['a', 'b']);
});

// ===== node:test =====

test('reorders columns', t => {
  if (readOnlyMode) {
    return; // Noncompliant {{Skip this test explicitly instead of returning early.}}
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

// ===== Bun =====

test('reorders columns', () => {
  if (readOnlyMode) {
    return; // Noncompliant {{Skip this test explicitly instead of returning early.}}
  }
  db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});

// Bun has no in-body skip; the fix moves the condition to the declaration.
// The chained call below is invisible to this rule (see "chained skipIf" case).
test.skipIf(readOnlyMode)('reorders columns', () => {
  db.reorderColumns(); // Compliant
  expect(db.columns).toEqual(['a', 'b']);
});

// ===== Edge cases =====

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
    return; // Noncompliant {{Skip this test explicitly instead of returning early.}}
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
    return; // Noncompliant {{Skip this test explicitly instead of returning early.}}
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
    return; // Noncompliant {{Skip this test explicitly instead of returning early.}}
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
