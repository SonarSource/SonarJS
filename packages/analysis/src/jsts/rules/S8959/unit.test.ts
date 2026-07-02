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

describe('S8959', () => {
  it('S8959', () => {
    ruleTester.run('UI test debug commands should not be committed to version control', rule, {
      valid: [
        {
          code: `
            it('waits for a Cypress alias', () => {
              cy.intercept('POST', '/users').as('saveUser');
              cy.get('button.save').click();
              cy.wait('@saveUser');
            });
          `,
          filename: 'cypress/e2e/save-user.cy.js',
        },
        {
          code: `
            test('waits for a Playwright condition', async ({ page }) => {
              await page.waitForTimeout(1000);
              await page.waitForURL('/users/1');
            });
          `,
          filename: 'tests/save-user.spec.ts',
        },
        {
          code: `
            test('ignores lookalike APIs', async () => {
              foo.pause();
              foo.debug();
              await adminPage.pause();
              await page.locator('button.save').pause();
              const myPage = page;
              await myPage.pause();
            });
          `,
          filename: 'tests/page-object.spec.ts',
        },
        {
          code: `
            it('ignores computed access', () => {
              cy['pause']();
              cy['debug']();
              page['pause']();
            });
          `,
          filename: 'tests/computed.spec.js',
        },
        {
          code: `
            cy.pause();
            cy.debug();
            page.pause();
          `,
          filename: 'src/app/page.ts',
        },
        {
          code: `
            test('ignores debugger statements', async ({ page }) => {
              debugger;
              await page.locator('button').click();
            });
          `,
          filename: 'tests/debugger.spec.ts',
        },
      ],
      invalid: [
        {
          code: `
            it('uses Cypress debug helpers', () => {
              cy.pause();
              cy.debug();
            });
          `,
          filename: 'cypress/e2e/save-user.cy.js',
          errors: [{ messageId: 'removeDebugCommand' }, { messageId: 'removeDebugCommand' }],
        },
        {
          code: `
            it('uses Cypress chain debug helpers', () => {
              cy.get('button.save').pause();
              cy.contains('Saved').debug();
            });
          `,
          filename: 'tests/save-user.spec.js',
          errors: [{ messageId: 'removeDebugCommand' }, { messageId: 'removeDebugCommand' }],
        },
        {
          code: `
            it('uses chained Cypress pause helpers', () => {
              cy.visit('/').pause();
            });
          `,
          filename: 'cypress/e2e/visit.cy.js',
          errors: [{ messageId: 'removeDebugCommand' }],
        },
        {
          code: `
            test('uses Playwright pause', async ({ page }) => {
              await page.pause();
            });
          `,
          filename: 'tests/save-user.spec.ts',
          errors: [{ messageId: 'removeDebugCommand' }],
        },
        {
          code: `
            test('reports non-awaited Playwright pause', () => {
              page.pause();
            });
          `,
          filename: 'tests/non-awaited.spec.ts',
          errors: [{ messageId: 'removeDebugCommand' }],
        },
        {
          code: `
            it('uses Cypress debug helpers via optional chaining', () => {
              cy?.pause();
              cy?.get('button.save').debug();
            });
          `,
          filename: 'cypress/e2e/save-user.cy.js',
          errors: [{ messageId: 'removeDebugCommand' }, { messageId: 'removeDebugCommand' }],
        },
      ],
    });
  });
});
