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
import { rule } from './index.js';
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

const ruleTester = new DefaultParserRuleTester();

const MESSAGE =
  'Remove this "await"; "getByRole" is a synchronous Testing Library query and does not wait for the element.';

describe('S9333', () => {
  it('S9333 (decorated: testing-library/no-await-sync-queries)', () => {
    ruleTester.run('Synchronous Testing Library queries should not be awaited', rule, {
      valid: [
        {
          code: `
            import { screen } from '@testing-library/react';
            test('shows the submit button', () => {
              const button = screen.getByRole('button', { name: 'Submit' });
              expect(button).toBeVisible();
            });
          `,
        },
        {
          code: `
            import { screen } from '@testing-library/react';
            test('shows the confirmation after save', async () => {
              const status = await screen.findByRole('status', { name: 'Saved' });
              expect(status).toBeVisible();
            });
          `,
        },
        {
          code: `
            async function clickSave(page) {
              await page.getByRole('button', { name: 'Save' }).click();
            }
          `,
        },
        {
          // Exercises the decorator FQN filter: upstream matches getByRole by name,
          // but the callee resolves outside @testing-library.*.
          code: `
            import { page } from '@playwright/test';
            async function clickSave() {
              await page.getByRole('button', { name: 'Save' });
            }
          `,
        },
      ],
      invalid: [
        {
          code: `
            import { screen } from '@testing-library/react';
            test('shows the submit button', async () => {
              const button = await screen.getByRole('button', { name: 'Submit' });
              expect(button).toBeVisible();
            });
          `,
          output: `
            import { screen } from '@testing-library/react';
            test('shows the submit button', async () => {
              const button =  screen.getByRole('button', { name: 'Submit' });
              expect(button).toBeVisible();
            });
          `,
          errors: [{ message: MESSAGE }],
        },
        {
          code: `
            import { render } from '@testing-library/react';
            test('lists the rows', async () => {
              const { queryAllByRole } = render(ui);
              const rows = await queryAllByRole('row');
              expect(rows).toHaveLength(2);
            });
          `,
          output: `
            import { render } from '@testing-library/react';
            test('lists the rows', async () => {
              const { queryAllByRole } = render(ui);
              const rows =  queryAllByRole('row');
              expect(rows).toHaveLength(2);
            });
          `,
          errors: [
            {
              message:
                'Remove this "await"; "queryAllByRole" is a synchronous Testing Library query and does not wait for the element.',
            },
          ],
        },
        {
          code: `
            import { screen, within } from '@testing-library/react';
            test('shows the image in the reusable block', async () => {
              const block = screen.getByTestId('reusable-block');
              const image = await within(block).getByLabelText('Image Block. Row 1');
              expect(image).toBeVisible();
            });
          `,
          output: `
            import { screen, within } from '@testing-library/react';
            test('shows the image in the reusable block', async () => {
              const block = screen.getByTestId('reusable-block');
              const image =  within(block).getByLabelText('Image Block. Row 1');
              expect(image).toBeVisible();
            });
          `,
          errors: [
            {
              message:
                'Remove this "await"; "getByLabelText" is a synchronous Testing Library query and does not wait for the element.',
            },
          ],
        },
      ],
    });
  });
});
