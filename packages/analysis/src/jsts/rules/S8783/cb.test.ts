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
import path from 'node:path';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';

describe('S8783', () => {
  it('reports forced browser interactions', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    const cypressFile = path.join(import.meta.dirname, 'fixtures', 'cypress', 'test.cy.js');
    const playwrightFile = path.join(import.meta.dirname, 'fixtures', 'playwright', 'test.spec.ts');
    const noDependencyFile = path.join(import.meta.dirname, 'fixtures', 'no-dependency', 'test.js');
    const expectedError = { messageId: 'removeForce' };

    ruleTester.run('no-forced-browser-interaction', rule, {
      valid: [
        {
          code: `
            cy.get('button[type=submit]').should('be.visible').and('be.enabled').click();
          `,
          filename: cypressFile,
        },
        {
          code: `
            cy.get('button[type=submit]').click();
            cy.get('input[type=checkbox]').check({ force: false });
            cy.get('input[name=zip]').type('75008', { delay: 10 });
          `,
          filename: cypressFile,
        },
        {
          code: `
            cy.get('button').click(10, 20);
            cy.get('button').trigger('mouseover', 'topLeft');
            cy.get('button').click('topLeft', { force: false });
          `,
          filename: cypressFile,
        },
        {
          code: `
            import { expect, test } from '@playwright/test';

            test('submits the form', async ({ page }) => {
              const submit = page.getByRole('button', { name: 'Submit' });
              await expect(submit).toBeVisible();
              await expect(submit).toBeEnabled();
              await submit.click();
            });
          `,
          filename: playwrightFile,
        },
        {
          code: `
            import { test } from '@playwright/test';

            test('updates profile', async ({ page }) => {
              await page.getByLabel('Name').fill('Ada');
              await page.getByLabel('Terms').check({ force: false });
            });
          `,
          filename: playwrightFile,
        },
        {
          code: `
            button.click({ force: true });
            const widget = { fill() {} };
            widget.fill('Ada', { force: true });
          `,
          filename: noDependencyFile,
        },
        {
          code: `
            import { test } from '@playwright/test';

            test('ignores non-locators', async () => {
              const menu = createMenu();
              await menu.click({ force: true });
              expect(button).toEqual({ force: true });
            });
          `,
          filename: playwrightFile,
        },
        {
          code: `
            import { test } from '@playwright/test';

            test('uses dynamic options', async ({ page }) => {
              const locator = page.getByRole('button');
              const shouldForce = true;
              await locator.click({ force: shouldForce });
            });
          `,
          filename: playwrightFile,
        },
      ],
      invalid: [
        {
          code: `
            it('submits the form', () => {
              cy.get('button[type=submit]').click({ force: true });
            });
          `,
          filename: cypressFile,
          errors: [expectedError],
        },
        {
          code: `
            cy.get('input[type=checkbox]').check({ force: true });
          `,
          filename: cypressFile,
          errors: [expectedError],
        },
        {
          code: `
            cy.get('input[name=zip]').clear({ force: true });
          `,
          filename: cypressFile,
          errors: [expectedError],
        },
        {
          code: `
            cy.get('input[name=zip]').type('75008', { force: true });
          `,
          filename: cypressFile,
          errors: [expectedError],
        },
        {
          code: `
            cy.contains('button', 'Save').click({ force: true });
          `,
          filename: cypressFile,
          errors: [expectedError],
        },
        {
          code: `
            cy.get('button').click('topLeft', { force: true });
          `,
          filename: cypressFile,
          errors: [expectedError],
        },
        {
          code: `
            cy.get('button').click(10, 20, { force: true });
          `,
          filename: cypressFile,
          errors: [expectedError],
        },
        {
          code: `
            cy.get('button').dblclick(10, 20, { force: true });
          `,
          filename: cypressFile,
          errors: [expectedError],
        },
        {
          code: `
            cy.get('button').rightclick('topRight', { force: true });
          `,
          filename: cypressFile,
          errors: [expectedError],
        },
        {
          code: `
            cy.get('button').trigger('mouseover', 'topLeft', { force: true });
          `,
          filename: cypressFile,
          errors: [expectedError],
        },
        {
          code: `
            cy.get('button').trigger('mouseover', 10, 20, { force: true });
          `,
          filename: cypressFile,
          errors: [expectedError],
        },
        {
          code: `
            import { test } from '@playwright/test';

            test('accepts terms', async ({ page }) => {
              await page.getByLabel('Terms').check({ force: true });
            });
          `,
          filename: playwrightFile,
          errors: [expectedError],
        },
        {
          code: `
            import { test } from '@playwright/test';

            test('submits the form', async ({ page }) => {
              await page.getByRole('button', { name: 'Submit' }).click({ force: true });
            });
          `,
          filename: playwrightFile,
          errors: [expectedError],
        },
        {
          code: `
            import { test } from '@playwright/test';

            test('updates profile', async ({ page }) => {
              await page.getByLabel('Name').fill('Ada', { force: true });
            });
          `,
          filename: playwrightFile,
          errors: [expectedError],
        },
        {
          code: `
            import { test } from '@playwright/test';

            test('submits the form', async ({ page }) => {
              const submit = page.getByRole('button', { name: 'Submit' });
              await submit.click({ force: true });
            });
          `,
          filename: playwrightFile,
          errors: [expectedError],
        },
        {
          code: `
            import { test } from '@playwright/test';

            test('clears the field', async ({ page }) => {
              await page.getByLabel('Name').clear({ force: true });
            });
          `,
          filename: playwrightFile,
          errors: [expectedError],
        },
        {
          code: `
            import { test } from '@playwright/test';

            test('selects the text', async ({ page }) => {
              await page.getByLabel('Name').selectText({ force: true });
            });
          `,
          filename: playwrightFile,
          errors: [expectedError],
        },
      ],
    });
  });
});
