/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import path from 'node:path';
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';
import { describe, it } from 'node:test';

describe('S8968', () => {
  it('excludes frameworks that cannot produce the misleading "passed" outcome', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Tests should be skipped explicitly', rule, {
      valid: [
        {
          code: `
import { it, expect } from '@jest/globals';
it('reorders columns', async () => {
  if (readOnlyMode) {
    return;
  }
  await db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});
`,
        },
        {
          code: `
import 'jasmine';
it('reorders columns', function () {
  if (readOnlyMode) {
    return;
  }
  db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});
`,
        },
        {
          code: `
import test from 'ava';
test('reorders columns', t => {
  if (readOnlyMode) {
    return;
  }
  db.reorderColumns();
  t.deepEqual(db.columns, ['a', 'b']);
});
`,
        },
        {
          code: `
import { test } from 'qunit';
test('reorders columns', function (assert) {
  if (readOnlyMode) {
    return;
  }
  db.reorderColumns();
  assert.deepEqual(db.columns, ['a', 'b']);
});
`,
        },
        {
          // No test framework is imported or depended on: Mocha can no longer be assumed
          // as a fallback, since that produced false positives on frameworks this rule
          // doesn't otherwise recognize (e.g. Jasmine loaded from a vendored copy rather
          // than an npm dependency, which looks the same as an untyped file to this rule).
          code: `
it('reorders columns', function () {
  if (readOnlyMode) {
    return;
  }
  db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});
`,
        },
      ],
      invalid: [
        {
          // Regression test for a project whose package.json depends on Jest (a fully
          // excluded framework) while this specific file explicitly imports Playwright:
          // the file's own import must win over the project-wide Jest dependency signal,
          // otherwise this unambiguous Playwright file would be wrongly excluded too.
          filename: path.join(
            import.meta.dirname,
            'fixtures',
            'jest-and-playwright',
            'checkout.spec.ts',
          ),
          code: `
import { test } from '@playwright/test';
test('checkout', async ({ page }) => {
  if (readOnlyMode) {
    return; // Noncompliant
  }
  await page.click('#reorder');
});
`,
          errors: [
            {
              messageId: 'playwright',
              suggestions: [
                {
                  messageId: 'suggestPlaywrightSkip',
                  output: `
import { test } from '@playwright/test';
test('checkout', async ({ page }) => {
  test.skip(readOnlyMode);
  await page.click('#reorder');
});
`,
                },
              ],
            },
          ],
        },
        {
          // Regression test for a project whose package.json depends on Jest (a fully
          // excluded framework) while this specific file explicitly imports Mocha: the
          // file's own import must win over the project-wide Jest dependency signal,
          // otherwise this unambiguous Mocha file would be wrongly excluded too.
          filename: path.join(import.meta.dirname, 'fixtures', 'jest-and-mocha', 'reorder.spec.ts'),
          code: `
import { it } from 'mocha';
it('reorders columns', function () {
  if (readOnlyMode) {
    return; // Noncompliant
  }
  db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});
`,
          errors: [
            {
              messageId: 'mocha',
              suggestions: [
                {
                  messageId: 'suggestMochaSkip',
                  output: `
import { it } from 'mocha';
it('reorders columns', function () {
  if (readOnlyMode) { this.skip(); }
  db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});
`,
                },
              ],
            },
          ],
        },
        {
          // Regression test for an aliased Mocha import combined with the `.only`
          // modifier: aliasing must not defeat detection, and `.only` must still be
          // recognized as a modifier that keeps the call an executing test case.
          code: `
import { it as mochaIt } from 'mocha';
mochaIt.only('reorders columns', function () {
  if (readOnlyMode) {
    return; // Noncompliant
  }
  db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});
`,
          errors: [
            {
              messageId: 'mocha',
              suggestions: [
                {
                  messageId: 'suggestMochaSkip',
                  output: `
import { it as mochaIt } from 'mocha';
mochaIt.only('reorders columns', function () {
  if (readOnlyMode) { this.skip(); }
  db.reorderColumns();
  expect(db.columns).toEqual(['a', 'b']);
});
`,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('offers a quickfix only when it has a safe target to call the framework skip mechanism on', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Tests should be skipped explicitly', rule, {
      valid: [],
      invalid: [
        {
          // Playwright's fix never depends on the callback's signature.
          code: `
import { test } from '@playwright/test';
test('reorders columns', async ({ page }) => {
  if (readOnlyMode) {
    return; // Noncompliant
  }
  await page.click('#reorder');
});
`,
          errors: [
            {
              messageId: 'playwright',
              suggestions: [
                {
                  messageId: 'suggestPlaywrightSkip',
                  output: `
import { test } from '@playwright/test';
test('reorders columns', async ({ page }) => {
  test.skip(readOnlyMode);
  await page.click('#reorder');
});
`,
                },
              ],
            },
          ],
        },
        {
          // The fix reuses the call's own (possibly aliased) test identifier.
          code: `
import { test as t } from '@playwright/test';
t('reorders columns', async ({ page }) => {
  if (readOnlyMode) {
    return; // Noncompliant
  }
  await page.click('#reorder');
});
`,
          errors: [
            {
              messageId: 'playwright',
              suggestions: [
                {
                  messageId: 'suggestPlaywrightSkip',
                  output: `
import { test as t } from '@playwright/test';
t('reorders columns', async ({ page }) => {
  t.skip(readOnlyMode);
  await page.click('#reorder');
});
`,
                },
              ],
            },
          ],
        },
        {
          // node:test: a fix is offered when the callback already has a context parameter.
          code: `
import test from 'node:test';
test('reorders columns', t => {
  if (readOnlyMode) {
    return; // Noncompliant
  }
  db.reorderColumns();
});
`,
          errors: [
            {
              messageId: 'nodeTest',
              suggestions: [
                {
                  messageId: 'suggestNodeTestSkip',
                  output: `
import test from 'node:test';
test('reorders columns', t => {
  if (readOnlyMode) { t.skip(); return; }
  db.reorderColumns();
});
`,
                },
              ],
            },
          ],
        },
        {
          // node:test: without a context parameter, there's nothing to call `skip()` on.
          code: `
import test from 'node:test';
test('reorders columns', () => {
  if (readOnlyMode) {
    return; // Noncompliant
  }
  db.reorderColumns();
});
`,
          errors: [{ messageId: 'nodeTest', suggestions: [] }],
        },
        {
          // Vitest: a destructured `{ skip }` context parameter is used as-is.
          code: `
import { it } from 'vitest';
it('reorders columns', async ({ skip }) => {
  if (readOnlyMode) {
    return; // Noncompliant
  }
  await db.reorderColumns();
});
`,
          errors: [
            {
              messageId: 'vitest',
              suggestions: [
                {
                  messageId: 'suggestVitestSkip',
                  output: `
import { it } from 'vitest';
it('reorders columns', async ({ skip }) => {
  if (readOnlyMode) { skip(); }
  await db.reorderColumns();
});
`,
                },
              ],
            },
          ],
        },
        {
          // Vitest: a renamed `{ skip: mySkip }` destructured binding is used as-is.
          code: `
import { it } from 'vitest';
it('reorders columns', async ({ skip: mySkip }) => {
  if (readOnlyMode) {
    return; // Noncompliant
  }
  await db.reorderColumns();
});
`,
          errors: [
            {
              messageId: 'vitest',
              suggestions: [
                {
                  messageId: 'suggestVitestSkip',
                  output: `
import { it } from 'vitest';
it('reorders columns', async ({ skip: mySkip }) => {
  if (readOnlyMode) { mySkip(); }
  await db.reorderColumns();
});
`,
                },
              ],
            },
          ],
        },
        {
          // Vitest: a plain (non-destructured) context parameter is used via `.skip`.
          code: `
import { it } from 'vitest';
it('reorders columns', async (ctx) => {
  if (readOnlyMode) {
    return; // Noncompliant
  }
  await db.reorderColumns();
});
`,
          errors: [
            {
              messageId: 'vitest',
              suggestions: [
                {
                  messageId: 'suggestVitestSkip',
                  output: `
import { it } from 'vitest';
it('reorders columns', async (ctx) => {
  if (readOnlyMode) { ctx.skip(); }
  await db.reorderColumns();
});
`,
                },
              ],
            },
          ],
        },
        {
          // Vitest: without a context parameter, there's nothing to call `skip()` on.
          code: `
import { it } from 'vitest';
it('reorders columns', async () => {
  if (readOnlyMode) {
    return; // Noncompliant
  }
  await db.reorderColumns();
});
`,
          errors: [{ messageId: 'vitest', suggestions: [] }],
        },
        {
          // Bun: a bare, unqualified test call with a parameterless callback is fixable.
          code: `
import { test } from 'bun:test';
test('reorders columns', () => {
  if (readOnlyMode) {
    return; // Noncompliant
  }
  db.reorderColumns();
});
`,
          errors: [
            {
              messageId: 'bun',
              suggestions: [
                {
                  messageId: 'suggestBunSkipIf',
                  output: `
import { test } from 'bun:test';
test.skipIf(readOnlyMode)('reorders columns', () => {
  db.reorderColumns();
});
`,
                },
              ],
            },
          ],
        },
        {
          // Bun: a `.only`-qualified call has no safe place to insert `.skipIf()`.
          code: `
import { test } from 'bun:test';
test.only('reorders columns', () => {
  if (readOnlyMode) {
    return; // Noncompliant
  }
  db.reorderColumns();
});
`,
          errors: [{ messageId: 'bun', suggestions: [] }],
        },
        {
          // Mocha: `this.skip()` is only safe in a `function` callback, not an arrow one.
          code: `
import { it } from 'mocha';
it('reorders columns', function () {
  if (readOnlyMode) {
    return; // Noncompliant
  }
  db.reorderColumns();
});
`,
          errors: [
            {
              messageId: 'mocha',
              suggestions: [
                {
                  messageId: 'suggestMochaSkip',
                  output: `
import { it } from 'mocha';
it('reorders columns', function () {
  if (readOnlyMode) { this.skip(); }
  db.reorderColumns();
});
`,
                },
              ],
            },
          ],
        },
        {
          // Mocha: an arrow callback has no `this` to call `.skip()` on.
          code: `
import { it } from 'mocha';
it('reorders columns', () => {
  if (readOnlyMode) {
    return; // Noncompliant
  }
  db.reorderColumns();
});
`,
          errors: [{ messageId: 'mocha', suggestions: [] }],
        },
      ],
    });
  });
});
