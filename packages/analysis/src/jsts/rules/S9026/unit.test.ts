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

describe('S9026', () => {
  it('S9026 (decorated: testing-library/await-async-queries)', () => {
    ruleTester.run('Promises returned by Testing Library async queries should be handled', rule, {
      valid: [
        {
          code: `
            import { screen } from '@testing-library/react';
            test('finds the button', async () => {
              const button = screen.findByRole('button');
              expect(await button).toBeVisible();
            });
          `,
        },
        {
          code: `
            import { screen } from '@testing-library/react';
            test('finds both buttons', async () => {
              await Promise.all([screen.findByRole('button'), screen.findAllByRole('button')]);
            });
          `,
        },
        {
          code: `
            import { screen } from '@testing-library/react';
            const findButton = () => screen.findByRole('button');
            test('finds the button', async () => {
              const button = await findButton();
              expect(button).toBeVisible();
            });
          `,
        },
      ],
      invalid: [
        {
          code: `
            import { screen } from '@testing-library/react';
            test('finds the button', async () => {
              const button = screen.findByRole('button');
              expect(button).toBeVisible();
            });
          `,
          output: `
            import { screen } from '@testing-library/react';
            test('finds the button', async () => {
              const button = screen.findByRole('button');
              expect(await button).toBeVisible();
            });
          `,
          errors: [
            {
              message:
                'The promise returned by findByRole is unhandled, so the test can continue before the queried element is available.',
            },
          ],
        },
        {
          code: `
            import { screen } from '@testing-library/react';
            test('finds all buttons', async () => {
              const buttons = screen.findAllByRole('button');
              expect(buttons).toHaveLength(2);
            });
          `,
          output: `
            import { screen } from '@testing-library/react';
            test('finds all buttons', async () => {
              const buttons = screen.findAllByRole('button');
              expect(await buttons).toHaveLength(2);
            });
          `,
          errors: [{ messageId: 'awaitAsyncQuery' }],
        },
        {
          code: `
            import { screen } from '@testing-library/react';
            const findButton = () => screen.findByRole('button');
            test('finds the button', () => {
              const button = findButton();
              expect(button).toBeVisible();
            });
          `,
          output: `
            import { screen } from '@testing-library/react';
            const findButton = () => screen.findByRole('button');
            test('finds the button', async () => {
              const button = await findButton();
              expect(button).toBeVisible();
            });
          `,
          errors: [
            {
              message:
                'The promise returned by async-query wrapper findButton is unhandled, so callers can proceed before its result is ready.',
            },
          ],
        },
        {
          code: `
            import { screen } from '@testing-library/react';
            test('finds the button', () => {
              screen.findByRole('button');
            });
          `,
          output: null,
          errors: [{ messageId: 'awaitAsyncQuery' }],
        },
        {
          code: `
            import { screen } from '@testing-library/react';
            async function outer() {
              function inner() {
                const button = screen.findByRole('button');
                expect(button).toBeVisible();
              }
              inner();
            }
          `,
          output: null,
          errors: [
            {
              message:
                'The promise returned by findByRole is unhandled, so the test can continue before the queried element is available.',
            },
          ],
        },
        {
          code: `
            import { screen } from '@testing-library/react';
            test('finds the button', async () => {
              const button = screen.findByRole('button');
              expect(button).toBeVisible();
              expect(button).toHaveAttribute('data-state', 'ready');
            });
          `,
          output: `
            import { screen } from '@testing-library/react';
            test('finds the button', async () => {
              const button = screen.findByRole('button');
              expect(await button).toBeVisible();
              expect(await button).toHaveAttribute('data-state', 'ready');
            });
          `,
          errors: [{ messageId: 'awaitAsyncQuery' }],
        },
      ],
    });
  });
});
