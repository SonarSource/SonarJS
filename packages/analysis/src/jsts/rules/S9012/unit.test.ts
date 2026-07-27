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
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './index.js';

const ruleTester = new DefaultParserRuleTester();

describe('S9012', () => {
  it('reports snapshots inside Testing Library waitFor callbacks', () => {
    ruleTester.run(
      'Snapshots should not be generated inside Testing Library async utilities',
      rule,
      {
        valid: [
          {
            code: `
            import { screen, waitFor } from '@testing-library/react';

            await waitFor(() => expect(screen.getByText('Ready')).toBeInTheDocument());
            expect(document.body).toMatchSnapshot();
          `,
          },
          {
            code: `
            import { waitFor } from './test-utils';

            await waitFor(() => expect(document.body).toMatchSnapshot());
          `,
          },
          {
            code: `
            import { waitFor } from './test-utils';

            await waitFor(() => expect(document.body).toMatchSnapshot());
          `,
            settings: {
              'testing-library/utils-module': './test-utils',
            },
          },
          {
            code: `
            import { vi } from 'vitest';

            await vi.waitFor(() => expect(document.body).toMatchInlineSnapshot());
          `,
          },
        ],
        invalid: [
          {
            code: `
            import { waitFor } from '@testing-library/react';

            await waitFor(() => expect(document.body).toMatchSnapshot());
          `,
            errors: [
              {
                message:
                  'Snapshots should not be generated inside `waitFor`; retries can create unstable snapshot artifacts.',
              },
            ],
          },
          {
            code: `
            import { waitFor } from '@testing-library/react';

            await waitFor(() => expect(document.body).toMatchInlineSnapshot());
          `,
            errors: [
              {
                message:
                  'Snapshots should not be generated inside `waitFor`; retries can create unstable snapshot artifacts.',
              },
            ],
          },
          {
            code: `
            import { waitFor as tlWaitFor } from '@testing-library/react';

            await tlWaitFor(() => expect(document.body).toMatchSnapshot());
          `,
            errors: [
              {
                message:
                  'Snapshots should not be generated inside `tlWaitFor`; retries can create unstable snapshot artifacts.',
              },
            ],
          },
          {
            code: `
            import * as rtl from '@testing-library/react';

            await rtl.waitFor(() => expect(document.body).toMatchSnapshot());
          `,
            errors: [
              {
                message:
                  'Snapshots should not be generated inside `waitFor`; retries can create unstable snapshot artifacts.',
              },
            ],
          },
          {
            code: `
            const { waitFor } = require('@testing-library/react');

            await waitFor(() => expect(document.body).toMatchSnapshot());
          `,
            errors: [
              {
                message:
                  'Snapshots should not be generated inside `waitFor`; retries can create unstable snapshot artifacts.',
              },
            ],
          },
          {
            code: `
            import { waitForElementToBeRemoved } from '@testing-library/react';

            await waitForElementToBeRemoved(() => expect(document.body).toMatchSnapshot());
          `,
            errors: [
              {
                message:
                  'Snapshots should not be generated inside `waitForElementToBeRemoved`; retries can create unstable snapshot artifacts.',
              },
            ],
          },
        ],
      },
    );
  });
});
