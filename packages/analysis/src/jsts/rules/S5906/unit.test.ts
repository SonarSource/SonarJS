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

describe('S5906', () => {
  it('reports generic assertions with more specific alternatives', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    const expectedError = (output: string) => ({
      messageId: 'preferSpecificAssertion',
      suggestions: [{ messageId: 'quickfix', output }],
    });

    ruleTester.run('prefer-specific-assertions', rule, {
      valid: [
        {
          code: `
            import { expect, test } from 'vitest';

            test('uses dedicated assertions', () => {
              expect(error).toBeNull();
              expect(items).toHaveLength(3);
              expect(summary.itemCount).toBe(2);
              expect(Boolean(value)).toBe(true);
            });
          `,
        },
        {
          code: `
            import { expect } from 'vitest';

            expect(value).toBeTruthy();
            expect(value).toBeFalsy();
            expect(items.includes(NaN)).toBe(true);
            expect(value == null).toBe(true);
            expect(value != null).toBe(false);
            expect(value).toBe(void sideEffect());
            expect(name > 'A').toBe(true);
            expect(startDate < endDate).toBe(true);
          `,
        },
        {
          code: `
            import { expect } from 'chai';

            expect(value).to.be.null;
            expect(items).to.have.lengthOf(2);
            expect(text).to.include('email');
            expect(value).to.be.true;
          `,
        },
        {
          code: `
            import assert from 'node:assert';

            assert.strictEqual(value, null);
          `,
        },
        {
          code: `
            import { assert } from 'chai';

            assert.strictEqual(value);
            assert.strictEqual(value, expected, message, extra);
            assert.equal(value, true);
            assert.strictEqual(value, maybe);
            assert.notStrictEqual(items.length, 2);
          `,
        },
        {
          code: `
            import { expect } from 'chai';

            expect(value).to.not.equal();
            expect(value).to.match(/ok/);
            expect(value).to.equal(maybe);
            expect(items.includes('admin')).to.equal(true);
          `,
        },
        {
          code: `
            expect(error).toBe(null);
          `,
        },
      ],
      invalid: [
        {
          code: `
            import { expect, test } from 'vitest';

            test('uses generic null assertion', () => {
              expect(error).toBe(null);
            });
          `,
          errors: [
            expectedError(`
            import { expect, test } from 'vitest';

            test('uses generic null assertion', () => {
              expect(error).toBeNull();
            });
          `),
          ],
        },
        {
          code: `
            import { expect } from 'jasmine';

            expect(error).toBe(null);
          `,
          errors: [
            expectedError(`
            import { expect } from 'jasmine';

            expect(error).toBeNull();
          `),
          ],
        },
        {
          code: `
            import { expect, test } from 'vitest';

            test('uses generic length assertion', () => {
              expect(items.length).toBe(3);
            });
          `,
          errors: [
            expectedError(`
            import { expect, test } from 'vitest';

            test('uses generic length assertion', () => {
              expect(items).toHaveLength(3);
            });
          `),
          ],
        },
        {
          code: `
            import { expect } from 'vitest';

            expect(value).not.toBe(undefined);
          `,
          errors: [
            expectedError(`
            import { expect } from 'vitest';

            expect(value).toBeDefined();
          `),
          ],
        },
        {
          code: `
            import { expect } from 'vitest';

            expect(value).toEqual(NaN);
          `,
          errors: [
            expectedError(`
            import { expect } from 'vitest';

            expect(value).toBeNaN();
          `),
          ],
        },
        {
          code: `
            import { expect } from 'vitest';

            expect(summary.itemCount === 2).toBe(true);
          `,
          errors: [
            expectedError(`
            import { expect } from 'vitest';

            expect(summary.itemCount).toBe(2);
          `),
          ],
        },
        {
          code: `
            import { expect } from 'vitest';

            expect(value === null).toBe(true);
          `,
          errors: [
            expectedError(`
            import { expect } from 'vitest';

            expect(value).toBeNull();
          `),
          ],
        },
        {
          code: `
            import { expect } from 'vitest';

            expect(value !== undefined).toBe(true);
          `,
          errors: [
            expectedError(`
            import { expect } from 'vitest';

            expect(value).toBeDefined();
          `),
          ],
        },
        {
          code: `
            import { expect } from 'vitest';

            expect(items.length === 2).toBe(true);
          `,
          errors: [
            expectedError(`
            import { expect } from 'vitest';

            expect(items).toHaveLength(2);
          `),
          ],
        },
        {
          code: `
            import { expect } from 'vitest';

            expect(total > 0).toBe(true);
          `,
          errors: [
            expectedError(`
            import { expect } from 'vitest';

            expect(total).toBeGreaterThan(0);
          `),
          ],
        },
        {
          code: `
            import { expect } from 'vitest';

            expect(diff >= 100).toBe(true);
          `,
          errors: [
            expectedError(`
            import { expect } from 'vitest';

            expect(diff).toBeGreaterThanOrEqual(100);
          `),
          ],
        },
        {
          code: `
            import { expect } from 'vitest';

            expect(user instanceof User).toBe(true);
          `,
          errors: [
            expectedError(`
            import { expect } from 'vitest';

            expect(user).toBeInstanceOf(User);
          `),
          ],
        },
        {
          code: `
            import { expect } from 'vitest';

            expect(text.includes('admin')).toBe(true);
          `,
          errors: [
            expectedError(`
            import { expect } from 'vitest';

            expect(text).toContain('admin');
          `),
          ],
        },
        {
          code: `
            import { expect } from 'vitest';

            expect(total <= 0).toBe(false);
          `,
          errors: [
            expectedError(`
            import { expect } from 'vitest';

            expect(total).toBeGreaterThan(0);
          `),
          ],
        },
        {
          code: `
            import { expect } from 'vitest';

            expect(user instanceof User).not.toBe(true);
          `,
          errors: [
            expectedError(`
            import { expect } from 'vitest';

            expect(user).not.toBeInstanceOf(User);
          `),
          ],
        },
        {
          code: `
            import { expect } from 'vitest';

            expect(total >= 0).toBe(false);
          `,
          errors: [
            expectedError(`
            import { expect } from 'vitest';

            expect(total).toBeLessThan(0);
          `),
          ],
        },
        {
          code: `
            import { expect } from 'vitest';

            expect(total < limit).toBe(false);
          `,
          errors: [
            expectedError(`
            import { expect } from 'vitest';

            expect(total).toBeGreaterThanOrEqual(limit);
          `),
          ],
        },
        {
          code: `
            import { expect } from 'vitest';

            expect(total <= limit).toBe(true);
          `,
          errors: [
            expectedError(`
            import { expect } from 'vitest';

            expect(total).toBeLessThanOrEqual(limit);
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            expect(value).to.equal(null);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            expect(value).to.be.null;
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            value.should.equal(undefined);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            value.should.be.undefined;
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            expect(items.length).to.equal(2);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            expect(items).to.have.lengthOf(2);
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            expect(user instanceof User).to.equal(true);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            expect(user).to.be.instanceOf(User);
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            expect(total <= 0).to.equal(false);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            expect(total).to.be.above(0);
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            expect(text.includes('admin')).to.not.equal(true);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            expect(text).to.not.include('admin');
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            expect(result, 'value type').to.equal(undefined);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            expect(result, 'value type').to.be.undefined;
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            expect(value).to.eq(null);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            expect(value).to.be.null;
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            value.should.equals(undefined);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            value.should.be.undefined;
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            expect(value).to.eqls(null);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            expect(value).to.be.null;
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            (user instanceof User).should.equal(true);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            user.should.be.instanceOf(User);
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            expect(typeof result === 'number').to.eql(true);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            expect(typeof result).to.equal('number');
          `),
          ],
        },
      ],
    });
  });

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
            assert.strictEqual(value, void sideEffect());
          `,
        },
        {
          code: `
            import 'cypress';

            cy.get('button').should('be.visible');
            cy.wrap(value).should('be.null');
            cy.wrap(value).should('equal', void sideEffect());
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
            import { expect, test } from '@playwright/test';

            test('does not treat a shadowed locator name as a locator', async ({ page }) => {
              const banner = page.getByRole('status');
              if (condition) {
                const banner = new Widget();
                expect(await banner.isVisible()).toBe(true);
              }
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
        {
          code: `
            import { expect, test } from '@playwright/test';

            test('checks custom values', async ({ api }) => {
              const widget = api.getById();
              const item = api.getByIdentifier();
              const row = api.locator('row');
              const banner = api.getByRole('status');

              expect(await widget.isVisible()).toBe(true);
              expect(await item.isVisible()).toBe(true);
              expect(await row.isVisible()).toBe(true);
              expect(await banner.isVisible()).toBe(true);
            });
          `,
        },
        {
          code: `
            import { expect } from 'vitest';
            import { test } from '@playwright/test';

            test('checks page', async ({ page }) => {
              const banner = page.getByRole('status');

              expect(await banner.isVisible()).toBe(true);
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
            import 'cypress';

            cy.wrap(value).should('not.deep.equal', null);
          `,
          errors: [
            expectedError(`
            import 'cypress';

            cy.wrap(value).should('not.be.null');
          `),
          ],
        },
        {
          code: `
            import 'cypress';

            cy.wrap(value).and('not.deep.equal', undefined);
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

            cy.wrap(value).should('be.null').and('equal', undefined);
          `,
          errors: [
            expectedError(`
            import 'cypress';

            cy.wrap(value).should('be.null').and('be.undefined');
          `),
          ],
        },
        {
          code: `
            import 'cypress';

            cy.wrap(value).should('exist').and('not.equal', null);
          `,
          errors: [
            expectedError(`
            import 'cypress';

            cy.wrap(value).should('exist').and('not.be.null');
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

            test('checks error', () => {
              expect(error).toBe(null);
            });
          `,
          errors: [
            expectedError(`
            import { expect, test } from '@playwright/test';

            test('checks error', () => {
              expect(error).toBeNull();
            });
          `),
          ],
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
