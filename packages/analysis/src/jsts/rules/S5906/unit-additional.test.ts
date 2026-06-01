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
import { describe, it } from 'node:test';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';

describe('S5906 additional assertion styles', () => {
  it('reports Chai assert, Cypress, and Playwright generic assertions', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    const expectedError = (output: string) => ({
      messageId: 'preferSpecificAssertion',
      suggestions: [{ messageId: 'quickfix', output }],
    });
    const expectedErrorWithoutSuggestion = {
      messageId: 'preferSpecificAssertion',
      suggestions: [],
    };

    ruleTester.run('prefer-specific-assertions', rule, {
      valid: [
        {
          code: `
            import { assert } from 'chai';

            assert.equal(value, null);
            assert.notEqual(value, undefined);
            assert.ok(value);
            assert.isTrue(value);
          `,
        },
        {
          code: `
            import 'cypress';

            cy.get('button').should('be.visible');
            cy.wrap(value).should('be.null');
          `,
        },
        {
          code: `
            import { expect, test } from '@playwright/test';

            test('checks page', async ({ page }) => {
              const banner = page.getByRole('status');
              await expect(banner).toBeVisible();
            });
          `,
        },
        {
          code: `
            import 'cypress';

            cy.get('button').should('equal', null);
            cy.wrap(value).should(option, null);
            cy.wrap(value).should('equal');
            cy.wrap(value).should('contain', null);
            cy.wrap(...values).should('be.false');
          `,
        },
        {
          code: `
            import { expect, test } from '@playwright/test';

            test('checks non-locator values', async ({ page }) => {
              expect(await page.title()).toBe('Home');
              expect(await page.locator('input').inputValue('name')).toEqual('Ada');
              expect(await page.locator('input').textContent()).toEqual('Ada');
            });
          `,
        },
      ],
      invalid: [
        {
          code: `
            import { assert } from 'chai';

            assert.strictEqual(value, undefined);
          `,
          errors: [
            expectedError(`
            import { assert } from 'chai';

            assert.isUndefined(value);
          `),
          ],
        },
        {
          code: `
            import { assert } from 'chai';

            assert.notStrictEqual(value, null, 'must be set');
          `,
          errors: [
            expectedError(`
            import { assert } from 'chai';

            assert.isNotNull(value, 'must be set');
          `),
          ],
        },
        {
          code: `
            import { assert } from 'chai';

            assert.strictEqual(user instanceof User, true);
          `,
          errors: [
            expectedError(`
            import { assert } from 'chai';

            assert.instanceOf(user, User);
          `),
          ],
        },
        {
          code: `
            import { assert } from 'chai';

            assert.strictEqual(messageText.includes('admin'), false, 'role missing');
          `,
          errors: [
            expectedError(`
            import { assert } from 'chai';

            assert.notInclude(messageText, 'admin', 'role missing');
          `),
          ],
        },
        {
          code: `
            import { assert } from 'chai';

            assert.strictEqual(items.length, 2, 'item count');
          `,
          errors: [
            expectedError(`
            import { assert } from 'chai';

            assert.lengthOf(items, 2, 'item count');
          `),
          ],
        },
        {
          code: `
            import 'cypress';

            cy.wrap(value).should('equal', null);
          `,
          errors: [
            expectedError(`
            import 'cypress';

            cy.wrap(value).should('be.null');
          `),
          ],
        },
        {
          code: `
            import 'cypress';

            cy.wrap(value).and('not.equal', undefined);
          `,
          errors: [
            expectedError(`
            import 'cypress';

            cy.wrap(value).and('not.be.undefined');
          `),
          ],
        },
        {
          code: `
            import 'cypress';

            cy.wrap(value).and('deep.equal', null);
          `,
          errors: [
            expectedError(`
            import 'cypress';

            cy.wrap(value).and('be.null');
          `),
          ],
        },
        {
          code: `
            import { expect, test } from '@playwright/test';

            test('checks page', async ({ page }) => {
              const banner = page.getByRole('status');

              expect(await banner.isVisible()).toBe(true);
            });
          `,
          errors: [expectedErrorWithoutSuggestion],
        },
        {
          code: `
            import { expect, test } from '@playwright/test';

            test('checks page', async ({ page }) => {
              const rows = page.getByRole('row');

              expect(await rows.count()).toBe(3);
            });
          `,
          errors: [expectedErrorWithoutSuggestion],
        },
        {
          code: `
            import { expect, test } from '@playwright/test';

            test('checks page', async ({ page }) => {
              const input = page.getByLabel('Name');

              expect(await input.inputValue()).toEqual('Ada');
            });
          `,
          errors: [expectedErrorWithoutSuggestion],
        },
        {
          code: `
            import { expect, test } from '@playwright/test';

            test('checks page', async ({ page }) => {
              expect(await page.getByTestId('input-name').inputValue()).toEqual('Ada');
            });
          `,
          errors: [expectedErrorWithoutSuggestion],
        },
        {
          code: `
            import { expect, test } from '@playwright/test';

            test('checks page', async ({ page }) => {
              const banner = page.getByRole('status');

              expect(await banner.isVisible()).not.toBe(true);
            });
          `,
          errors: [expectedErrorWithoutSuggestion],
        },
        {
          code: `
            import { expect, test } from '@playwright/test';

            test('checks page', async ({ page }) => {
              const input = page.getByLabel('Name');

              expect(await input.inputValue()).not.toEqual('Ada');
            });
          `,
          errors: [expectedErrorWithoutSuggestion],
        },
      ],
    });
  });
});
