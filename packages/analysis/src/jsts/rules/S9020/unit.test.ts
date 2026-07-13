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
import { rules as testingLibraryRules } from '../external/testing-library.js';
import { rule } from './index.js';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

const ruleTester = new NoTypeCheckingRuleTester();

// Sentinel: these upstream fixes require the decorator's safety guards.
describe('S9020 upstream sentinel', () => {
  it('upstream prefer-find-by fixes query bindings and drops async wait options', () => {
    ruleTester.run('prefer-find-by', testingLibraryRules['prefer-find-by'], {
      valid: [],
      invalid: [
        {
          code: `
            import { getByRole, waitFor } from '@testing-library/dom';
            const status = await waitFor(() => getByRole(document.body, 'status'));
          `,
          output: `
            import { getByRole, waitFor } from '@testing-library/dom';
            const status = await findByRole(document.body, 'status');
          `,
          errors: [{ messageId: 'preferFindBy' }],
        },
        {
          code: `
            import { screen, waitFor } from '@testing-library/react';
            const options = { timeout: 2_000 };
            const status = await waitFor(() => screen.getByRole('status'), options);
          `,
          output: `
            import { screen, waitFor } from '@testing-library/react';
            const options = { timeout: 2_000 };
            const status = await screen.findByRole('status');
          `,
          errors: [{ messageId: 'preferFindBy' }],
        },
        {
          code: `
            import { getByRole, waitFor } from '@testing-library/dom';
            await waitFor(() => expect(getByRole(document.body, 'status')).toBeInTheDocument());
          `,
          output: `
            import { getByRole, waitFor } from '@testing-library/dom';
            await findByRole(document.body, 'status');
          `,
          errors: [{ messageId: 'preferFindBy' }],
        },
        {
          code: `
            import { screen, waitFor } from '@testing-library/react';
            await waitFor(
              async () => {
                const status = await screen.findByRole('status');
                expect(status).toBeVisible();
              },
              { timeout: 2_000 },
            );
          `,
          output: `
            import { screen, waitFor } from '@testing-library/react';
            const status = await screen.findByRole('status');
            expect(status).toBeVisible();
          `,
          errors: [{ messageId: 'preferFindBy' }],
        },
      ],
    });
  });
});

describe('S9020', () => {
  it('reports only Testing Library waitFor calls', () => {
    ruleTester.run(
      'Use "find*" to query Testing Library elements that may not be available yet',
      rule,
      {
        valid: [
          {
            code: `
            import { screen } from '@testing-library/react';
            import { waitFor } from './local-wait-for';
            await waitFor(() => screen.getByRole('status', { name: 'Saved' }));
          `,
          },
          {
            code: `
            import { screen, waitFor } from '@testing-library/react';
            await waitFor(function () {
              return screen.getByRole('status');
            });
          `,
          },
          {
            code: `
            import { screen, waitFor } from '@testing-library/react';
            await waitFor(() => {
              return screen.getByRole('status');
            });
          `,
          },
          {
            code: `
            import { screen, waitFor } from '@testing-library/react';
            await waitFor(() => expect(screen.getByRole('submit')).toBeDisabled());
          `,
          },
          {
            code: `
            import { screen, waitForElementToBeRemoved } from '@testing-library/react';
            await waitForElementToBeRemoved(() => screen.queryByRole('alert'));
          `,
          },
          {
            code: `
            import { screen } from '@testing-library/react';
            const status = screen.getByRole('status') as HTMLElement;
          `,
            filename: 'status.test.ts',
          },
        ],
        invalid: [],
      },
    );
  });

  it('preserves safe findBy rewrites', () => {
    ruleTester.run(
      'Use "find*" to query Testing Library elements that may not be available yet',
      rule,
      {
        valid: [],
        invalid: [
          {
            code: `
            import { screen, waitFor } from '@testing-library/react';
            const status = await waitFor(() => screen.getByRole('status', { name: 'Saved' }));
          `,
            output: `
            import { screen, waitFor } from '@testing-library/react';
            const status = await screen.findByRole('status', { name: 'Saved' });
          `,
            errors: [{ messageId: 'preferFindBy' }],
          },
          {
            code: `
            import { screen, waitFor } from '@testing-library/react';
            const statuses = await waitFor(() => screen.getAllByRole('status'));
          `,
            output: `
            import { screen, waitFor } from '@testing-library/react';
            const statuses = await screen.findAllByRole('status');
          `,
            errors: [{ messageId: 'preferFindBy' }],
          },
          {
            code: `
            import { screen, waitFor } from '@testing-library/react';
            const status = await waitFor(() => screen.queryByRole('status'));
          `,
            output: `
            import { screen, waitFor } from '@testing-library/react';
            const status = await screen.findByRole('status');
          `,
            errors: [{ messageId: 'preferFindBy' }],
          },
          {
            code: `
            import { screen, waitFor } from '@testing-library/react';
            const statuses = await waitFor(() => screen.queryAllByRole('status'));
          `,
            output: `
            import { screen, waitFor } from '@testing-library/react';
            const statuses = await screen.findAllByRole('status');
          `,
            errors: [{ messageId: 'preferFindBy' }],
          },
          {
            code: `
            import { screen, waitFor } from '@testing-library/react';
            const status = await waitFor(
              () => screen.getByRole('status', { name: 'Saved' }),
              { timeout: 2_000 },
            );
          `,
            output: `
            import { screen, waitFor } from '@testing-library/react';
            const status = await screen.findByRole('status', { name: 'Saved' }, { timeout: 2_000 });
          `,
            errors: [{ messageId: 'preferFindBy' }],
          },
          {
            code: `
            import { screen, waitFor } from '@testing-library/react';
            await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
          `,
            output: `
            import { screen, waitFor } from '@testing-library/react';
            expect(await screen.findByRole('status')).toBeInTheDocument();
          `,
            errors: [{ messageId: 'preferFindBy' }],
          },
          {
            code: `
            import { screen, waitFor as tlWaitFor } from '@testing-library/react';
            const status = await tlWaitFor(() => screen.getByRole('status'));
          `,
            output: `
            import { screen, waitFor as tlWaitFor } from '@testing-library/react';
            const status = await screen.findByRole('status');
          `,
            errors: [{ messageId: 'preferFindBy' }],
          },
          {
            code: `
            import { screen, waitFor } from '@testing-library/react';
            await waitFor(async () => {
              const status = await screen.findByRole('status');
              expect(status).toBeVisible();
            });
          `,
            output: `
            import { screen, waitFor } from '@testing-library/react';
            const status = await screen.findByRole('status');
            expect(status).toBeVisible();
          `,
            errors: [{ messageId: 'preferFindBy' }],
          },
        ],
      },
    );
  });

  it('reports unavailable or unsafe rewrites without an autofix', () => {
    ruleTester.run(
      'Use "find*" to query Testing Library elements that may not be available yet',
      rule,
      {
        valid: [],
        invalid: [
          {
            code: `
            import { screen, waitFor } from '@testing-library/react';
            await waitFor(() => screen.getByRole('status', { name: 'Saved' }));
          `,
            output: null,
            errors: [{ messageId: 'preferFindBy' }],
          },
          {
            code: `
            import { screen, waitFor } from '@testing-library/react';
            const options = { timeout: 2_000 };
            const status = await waitFor(
              () => screen.getByRole('status', { name: 'Saved' }),
              options,
            );
          `,
            output: null,
            errors: [{ messageId: 'preferFindBy' }],
          },
          {
            code: `
            import { screen, waitFor } from '@testing-library/react';
            const status = await waitFor(
              () => screen.getByRole('status'),
              { timeout: 2_000 },
            );
          `,
            output: null,
            errors: [{ messageId: 'preferFindBy' }],
          },
          {
            code: `
            import { getByRole, waitFor } from '@testing-library/dom';
            const status = await waitFor(() => getByRole(document.body, 'status'));
          `,
            output: null,
            errors: [{ messageId: 'preferFindBy' }],
          },
          {
            code: `
            import { getByRole, waitFor } from '@testing-library/dom';
            await waitFor(() => expect(getByRole(document.body, 'status')).toBeInTheDocument());
          `,
            output: null,
            errors: [{ messageId: 'preferFindBy' }],
          },
          {
            code: `
            import { screen, waitFor } from '@testing-library/react';
            await waitFor(
              async () => {
                const status = await screen.findByRole('status');
                expect(status).toBeVisible();
              },
              { timeout: 2_000 },
            );
          `,
            output: null,
            errors: [{ messageId: 'preferFindBy' }],
          },
        ],
      },
    );
  });
});
