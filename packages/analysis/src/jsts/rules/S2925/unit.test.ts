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

const ruleTester = new NoTypeCheckingRuleTester();

describe('S2925', () => {
  it('S2925', () => {
    ruleTester.run('Fixed waits should not be used in tests', rule, {
      valid: [
        {
          code: `
            it('saves a user', () => {
              cy.intercept('POST', '/users').as('saveUser');
              cy.get('button.save').click();
              cy.wait('@saveUser');
              cy.contains('Saved').should('be.visible');
            });
          `,
          filename: 'cypress/e2e/save-user.cy.js',
        },
        {
          code: `
            it('waits for all profile requests', () => {
              cy.wait(['@profile', '@settings']);
              cy.wait(alias);
              cy.wait(\`@profile\`);
              cy.wait();
            });
          `,
          filename: 'cypress/e2e/profile.cy.js',
        },
        {
          code: `
            import { WAIT } from './constants';
            it('ignores imported constants', () => {
              cy.wait(WAIT);
            });
          `,
          filename: 'cypress/e2e/imported.cy.js',
        },
        {
          code: `
            it('ignores string-aliased identifiers', () => {
              const aliasVar = '@save';
              cy.wait(aliasVar);
            });
          `,
          filename: 'cypress/e2e/alias.cy.js',
        },
        {
          code: `
            it('ignores function parameters', () => {
              function w(amount) {
                cy.wait(amount);
              }
              w(1000);
            });
          `,
          filename: 'cypress/e2e/param.cy.js',
        },
        {
          code: `
            it('ignores multi-write variables', () => {
              let amount = 1000;
              amount = computeWait();
              cy.wait(amount);
            });
          `,
          filename: 'cypress/e2e/multi-write.cy.js',
        },
        {
          code: `
            it('ignores uninitialised variables', () => {
              let amount;
              cy.wait(amount);
            });
          `,
          filename: 'cypress/e2e/uninit.cy.js',
        },
        {
          code: `
            test('saves a user', async ({ page }) => {
              await page.getByRole('button', { name: 'Save' }).click();
              await expect(page.getByText('Saved')).toBeVisible();
              await page.waitForURL('/users/1');
              await page.waitForResponse('/api/users/1');
            });
          `,
          filename: 'tests/save-user.spec.ts',
        },
        {
          code: `
            test('saves a user', async () => {
              await page.click('button.save');
              await page.waitForSelector('.toast');
              expect(await page.$eval('.toast', node => node.textContent)).toContain('Saved');
            });
          `,
          filename: 'tests/save-user.test.js',
        },
        {
          code: `
            test('ignores lookalike APIs', async () => {
              foo.wait(1000);
              foo.pause();
              foo.debug();
              await adminPage.waitForTimeout(1000);
              await adminPage.pause();
            });
          `,
          filename: 'tests/page-object.spec.ts',
        },
        {
          code: `
            it('ignores computed access', () => {
              cy['wait'](1000);
              page['waitForTimeout'](1000);
            });
          `,
          filename: 'tests/computed.spec.js',
        },
        {
          code: `
            cy.wait(1000);
            page.waitForTimeout(1000);
          `,
          filename: 'src/app/page.ts',
        },
        {
          code: `
            it('keeps Cypress debug helpers out of scope', () => {
              cy.pause();
              cy.get('button.save').debug();
            });
          `,
          filename: 'tests/debug-cypress.spec.js',
        },
        {
          code: `
            test('keeps Playwright pause out of scope', async ({ page }) => {
              await page.pause();
              page.pause();
            });
          `,
          filename: 'tests/debug-playwright.spec.ts',
        },
        {
          code: `
            it('ignores generic Promise waits', async () => {
              await new Promise(resolve => setTimeout(resolve, 1000));
              await Promise.race([action(), new Promise(resolve => setTimeout(resolve, 5000))]);
            });
          `,
          filename: 'tests/promise-wait.test.js',
        },
      ],
      invalid: [
        {
          code: `
            it('waits fixed Cypress durations', () => {
              cy.wait(0);
              cy.wait(-1);
              cy.wait(+1000);
            });
          `,
          filename: 'tests/retries.test.js',
          errors: [
            { messageId: 'fixedWait' },
            { messageId: 'fixedWait' },
            { messageId: 'fixedWait' },
          ],
        },
        {
          code: `
            it('resolves identifier arguments to numeric literals', () => {
              const WAIT = 1000;
              const NEG = -1;
              const ZERO = 0;
              cy.wait(WAIT);
              cy.wait(NEG);
              cy.wait(ZERO);
            });
          `,
          filename: 'cypress/e2e/constants.cy.js',
          errors: [
            { messageId: 'fixedWait' },
            { messageId: 'fixedWait' },
            { messageId: 'fixedWait' },
          ],
        },
        {
          code: `
            test('saves a user', async ({ page }) => {
              await page.getByRole('button', { name: 'Save' }).click();
              await page.waitForTimeout(1000);
              await expect(page.getByText('Saved')).toBeVisible();
            });
          `,
          filename: 'tests/save-user.spec.ts',
          errors: [{ messageId: 'fixedWait' }],
        },
        {
          code: `
            test('saves a user', async () => {
              await page.click('button.save');
              await page.waitForTimeout(1000);
              expect(await page.$('.toast')).not.toBeNull();
            });
          `,
          filename: 'tests/save-user.e2e.js',
          errors: [{ messageId: 'fixedWait' }],
        },
        {
          code: `
            test('reports non-awaited fixed waits', () => {
              page.waitForTimeout(1000);
            });
          `,
          filename: 'tests/non-awaited.spec.ts',
          errors: [{ messageId: 'fixedWait' }],
        },
      ],
    });
  });
});
