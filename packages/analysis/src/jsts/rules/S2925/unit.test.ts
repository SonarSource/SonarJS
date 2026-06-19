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
import path from 'node:path/posix';
import { describe, it } from 'node:test';
import { normalizeToAbsolutePath } from '../helpers/files.js';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';

const dirname = import.meta.dirname;
const fixtures = path.join(normalizeToAbsolutePath(dirname), 'fixtures');
const cypressFile = path.join(fixtures, 'cypress', 'test.js');
const playwrightFile = path.join(fixtures, 'playwright', 'test.ts');
const puppeteerFile = path.join(fixtures, 'puppeteer', 'test.js');
const noFrameworkFile = path.join(fixtures, 'no-framework', 'test.js');

const FIXED_WAIT = 'Replace this fixed wait with a synchronization on an observable condition.';
const DEBUG_PAUSE = 'Remove this debug pause from the test.';

process.chdir(import.meta.dirname); // keep dependency lookup inside this rule fixture tree

describe('S2925', () => {
  it('S2925', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('Fixed waits and debug pauses should not be used in tests', rule, {
      valid: [
        {
          code: `
            page.waitForTimeout(1000);
            page.pause();
            cy.wait(1000);
            cy.debug();
          `,
          filename: noFrameworkFile,
        },
        {
          code: `
            cy.wait('@saveUser');
            cy.wait(['@saveUser', '@refreshUser']);
          `,
          filename: cypressFile,
        },
        {
          code: `
            import { test } from '@playwright/test';

            test('waits for an observable condition', async ({ page }) => {
              await page.waitForSelector('.toast');
            });
          `,
          filename: playwrightFile,
        },
        {
          code: `
            async function waitForToast(page) {
              await page.waitForSelector('.toast');
            }
          `,
          filename: puppeteerFile,
        },
      ],
      invalid: [
        {
          code: `
            cy.wait(1000);
          `,
          filename: cypressFile,
          errors: [{ message: FIXED_WAIT }],
        },
        {
          code: `
            cy.pause();
            cy.debug();
          `,
          filename: cypressFile,
          errors: [{ message: DEBUG_PAUSE }, { message: DEBUG_PAUSE }],
        },
        {
          code: `
            import { test } from '@playwright/test';

            test('keeps debug code around', async ({ page }) => {
              await page.waitForTimeout(1000);
              await page.pause();
            });
          `,
          filename: playwrightFile,
          errors: [{ message: FIXED_WAIT }, { message: DEBUG_PAUSE }],
        },
        {
          code: `
            async function waitForToast(page) {
              await page.waitForTimeout(1000);
            }
          `,
          filename: puppeteerFile,
          errors: [{ message: FIXED_WAIT }],
        },
      ],
    });
  });
});
