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
          errors: [{ messageId: 'playwright' }],
        },
      ],
    });
  });
});
