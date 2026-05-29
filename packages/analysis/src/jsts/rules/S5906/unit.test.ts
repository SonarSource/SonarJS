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
    const expectedErrorWithoutSuggestion = {
      messageId: 'preferSpecificAssertion',
      suggestions: [],
    };

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
            import { expect } from 'jasmine';

            expect(error).toBe(null);
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
            expect(value).toEqual(NaN);
            expect(Number.isFinite(total)).toBe(false);
          `,
          errors: [
            expectedError(`
            import { expect } from 'vitest';

            expect(value).toBeDefined();
            expect(value).toEqual(NaN);
            expect(Number.isFinite(total)).toBe(false);
          `),
            expectedError(`
            import { expect } from 'vitest';

            expect(value).not.toBe(undefined);
            expect(value).toBeNaN();
            expect(Number.isFinite(total)).toBe(false);
          `),
          ],
        },
        {
          code: `
            import { expect } from 'vitest';

            expect(summary.itemCount === 2).toBe(true);
            expect(total > 0).toBe(true);
            expect(user instanceof User).toBe(true);
            expect(text.includes('admin')).toBe(true);
          `,
          errors: [
            expectedError(`
            import { expect } from 'vitest';

            expect(summary.itemCount).toBe(2);
            expect(total > 0).toBe(true);
            expect(user instanceof User).toBe(true);
            expect(text.includes('admin')).toBe(true);
          `),
            expectedError(`
            import { expect } from 'vitest';

            expect(summary.itemCount === 2).toBe(true);
            expect(total).toBeGreaterThan(0);
            expect(user instanceof User).toBe(true);
            expect(text.includes('admin')).toBe(true);
          `),
            expectedError(`
            import { expect } from 'vitest';

            expect(summary.itemCount === 2).toBe(true);
            expect(total > 0).toBe(true);
            expect(user).toBeInstanceOf(User);
            expect(text.includes('admin')).toBe(true);
          `),
            expectedError(`
            import { expect } from 'vitest';

            expect(summary.itemCount === 2).toBe(true);
            expect(total > 0).toBe(true);
            expect(user instanceof User).toBe(true);
            expect(text).toContain('admin');
          `),
          ],
        },
        {
          code: `
            import { expect } from 'vitest';

            expect(total <= 0).toBe(false);
            expect(user instanceof User).not.toBe(true);
            expect(total >= 0).toBe(false);
            expect(total < limit).toBe(false);
            expect(total <= limit).toBe(true);
          `,
          errors: [
            expectedError(`
            import { expect } from 'vitest';

            expect(total).toBeGreaterThan(0);
            expect(user instanceof User).not.toBe(true);
            expect(total >= 0).toBe(false);
            expect(total < limit).toBe(false);
            expect(total <= limit).toBe(true);
          `),
            expectedError(`
            import { expect } from 'vitest';

            expect(total <= 0).toBe(false);
            expect(user).not.toBeInstanceOf(User);
            expect(total >= 0).toBe(false);
            expect(total < limit).toBe(false);
            expect(total <= limit).toBe(true);
          `),
            expectedError(`
            import { expect } from 'vitest';

            expect(total <= 0).toBe(false);
            expect(user instanceof User).not.toBe(true);
            expect(total).toBeLessThan(0);
            expect(total < limit).toBe(false);
            expect(total <= limit).toBe(true);
          `),
            expectedError(`
            import { expect } from 'vitest';

            expect(total <= 0).toBe(false);
            expect(user instanceof User).not.toBe(true);
            expect(total >= 0).toBe(false);
            expect(total).toBeGreaterThanOrEqual(limit);
            expect(total <= limit).toBe(true);
          `),
            expectedError(`
            import { expect } from 'vitest';

            expect(total <= 0).toBe(false);
            expect(user instanceof User).not.toBe(true);
            expect(total >= 0).toBe(false);
            expect(total < limit).toBe(false);
            expect(total).toBeLessThanOrEqual(limit);
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            expect(value).to.equal(null);
            value.should.equal(undefined);
            expect(items.length).to.equal(2);
            expect(user instanceof User).to.equal(true);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            expect(value).to.be.null;
            value.should.equal(undefined);
            expect(items.length).to.equal(2);
            expect(user instanceof User).to.equal(true);
          `),
            expectedError(`
            import { expect } from 'chai';

            expect(value).to.equal(null);
            value.should.be.undefined;
            expect(items.length).to.equal(2);
            expect(user instanceof User).to.equal(true);
          `),
            expectedError(`
            import { expect } from 'chai';

            expect(value).to.equal(null);
            value.should.equal(undefined);
            expect(items).to.have.lengthOf(2);
            expect(user instanceof User).to.equal(true);
          `),
            expectedError(`
            import { expect } from 'chai';

            expect(value).to.equal(null);
            value.should.equal(undefined);
            expect(items.length).to.equal(2);
            expect(user).to.be.instanceOf(User);
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            expect(total <= 0).to.equal(false);
            expect(text.includes('admin')).to.not.equal(true);
            expect(result, 'value type').to.equal(undefined);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            expect(total).to.be.above(0);
            expect(text.includes('admin')).to.not.equal(true);
            expect(result, 'value type').to.equal(undefined);
          `),
            expectedError(`
            import { expect } from 'chai';

            expect(total <= 0).to.equal(false);
            expect(text).to.not.include('admin');
            expect(result, 'value type').to.equal(undefined);
          `),
            expectedError(`
            import { expect } from 'chai';

            expect(total <= 0).to.equal(false);
            expect(text.includes('admin')).to.not.equal(true);
            expect(result, 'value type').to.be.undefined;
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
        {
          code: `
            import { assert } from 'chai';

            assert.strictEqual(value, undefined);
            assert.notStrictEqual(value, null, 'must be set');
            assert.strictEqual(user instanceof User, true);
            assert.strictEqual(messageText.includes('admin'), false, 'role missing');
            assert.strictEqual(items.length, 2, 'item count');
          `,
          errors: [
            expectedError(`
            import { assert } from 'chai';

            assert.isUndefined(value);
            assert.notStrictEqual(value, null, 'must be set');
            assert.strictEqual(user instanceof User, true);
            assert.strictEqual(messageText.includes('admin'), false, 'role missing');
            assert.strictEqual(items.length, 2, 'item count');
          `),
            expectedError(`
            import { assert } from 'chai';

            assert.strictEqual(value, undefined);
            assert.isNotNull(value, 'must be set');
            assert.strictEqual(user instanceof User, true);
            assert.strictEqual(messageText.includes('admin'), false, 'role missing');
            assert.strictEqual(items.length, 2, 'item count');
          `),
            expectedError(`
            import { assert } from 'chai';

            assert.strictEqual(value, undefined);
            assert.notStrictEqual(value, null, 'must be set');
            assert.instanceOf(user, User);
            assert.strictEqual(messageText.includes('admin'), false, 'role missing');
            assert.strictEqual(items.length, 2, 'item count');
          `),
            expectedError(`
            import { assert } from 'chai';

            assert.strictEqual(value, undefined);
            assert.notStrictEqual(value, null, 'must be set');
            assert.strictEqual(user instanceof User, true);
            assert.notInclude(messageText, 'admin', 'role missing');
            assert.strictEqual(items.length, 2, 'item count');
          `),
            expectedError(`
            import { assert } from 'chai';

            assert.strictEqual(value, undefined);
            assert.notStrictEqual(value, null, 'must be set');
            assert.strictEqual(user instanceof User, true);
            assert.strictEqual(messageText.includes('admin'), false, 'role missing');
            assert.lengthOf(items, 2, 'item count');
          `),
          ],
        },
        {
          code: `
            import 'cypress';

            cy.wrap(value).should('equal', null);
            cy.wrap(value).and('not.equal', undefined);
            cy.wrap(value).and('deep.equal', null);
            cy.wrap(value).should('be.false');
          `,
          errors: [
            expectedError(`
            import 'cypress';

            cy.wrap(value).should('be.null');
            cy.wrap(value).and('not.equal', undefined);
            cy.wrap(value).and('deep.equal', null);
            cy.wrap(value).should('be.false');
          `),
            expectedError(`
            import 'cypress';

            cy.wrap(value).should('equal', null);
            cy.wrap(value).and('not.be.undefined');
            cy.wrap(value).and('deep.equal', null);
            cy.wrap(value).should('be.false');
          `),
            expectedError(`
            import 'cypress';

            cy.wrap(value).should('equal', null);
            cy.wrap(value).and('not.equal', undefined);
            cy.wrap(value).and('be.null');
            cy.wrap(value).should('be.false');
          `),
          ],
        },
        {
          code: `
            import { expect, test } from '@playwright/test';

            test('checks page', async ({ page }) => {
              const banner = page.getByRole('status');
              const rows = page.getByRole('row');
              const input = page.getByLabel('Name');

              expect(await banner.isVisible()).toBe(true);
              expect(await rows.count()).toBe(3);
              expect(await input.inputValue()).toEqual('Ada');
              expect(await page.getByTestId('input-name').inputValue()).toEqual('Ada');
              expect(await banner.isVisible()).not.toBe(true);
              expect(await input.inputValue()).not.toEqual('Ada');
            });
          `,
          errors: [
            expectedErrorWithoutSuggestion,
            expectedErrorWithoutSuggestion,
            expectedErrorWithoutSuggestion,
            expectedErrorWithoutSuggestion,
            expectedErrorWithoutSuggestion,
            expectedErrorWithoutSuggestion,
          ],
        },
      ],
    });
  });
});
