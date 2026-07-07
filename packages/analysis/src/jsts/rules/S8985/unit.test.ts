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

describe('S8985', () => {
  it('S8985 (decorated: testing-library/no-wait-for-side-effects)', () => {
    ruleTester.run('Side effects should not be performed inside "waitFor" callbacks', rule, {
      valid: [
        {
          // side effect happens before waitFor, only the assertion is retried
          code: `
              import { render, screen, fireEvent, waitFor } from '@testing-library/react';
              fireEvent.click(screen.getByRole('button'));
              await waitFor(() => {
                screen.getByText('Success');
              });
            `,
        },
        {
          // side effect placed in a .then() chained after waitFor() only runs once
          code: `
              import { fireEvent, waitFor } from '@testing-library/react';
              await waitFor(() => screen.getByText('Loading')).then(() => {
                fireEvent.click(screen.getByRole('button'));
              });
            `,
        },
        {
          // a same-named local helper is not Testing Library's "waitFor"
          code: `
              import { fireEvent } from '@testing-library/react';
              import { waitFor } from './my-local-wait-for';
              waitFor(() => {
                fireEvent.click(document.body);
              });
            `,
        },
        {
          // a same-named local helper is not Testing Library's "render",
          // even inside a genuine "waitFor" callback
          code: `
              import { waitFor } from '@testing-library/react';
              import { render } from './my-local-render';
              waitFor(() => {
                render();
              });
            `,
        },
      ],
      invalid: [
        {
          // click inside a waitFor block statement
          code: `
              import { render, screen, fireEvent, waitFor } from '@testing-library/react';
              await waitFor(() => {
                fireEvent.click(screen.getByRole('button'));
              });
            `,
          output: `
              import { render, screen, fireEvent, waitFor } from '@testing-library/react';
              fireEvent.click(screen.getByRole('button'));
            `,
          errors: [{ messageId: 'noSideEffectsWaitFor' }],
        },
        {
          // render inside a waitFor block statement
          code: `
              import { render, waitFor } from '@testing-library/react';
              await waitFor(() => {
                render(<Form />);
              });
            `,
          output: `
              import { render, waitFor } from '@testing-library/react';
              render(<Form />);
            `,
          errors: [{ messageId: 'noSideEffectsWaitFor' }],
        },
        {
          // userEvent call as the implicit return of the waitFor callback
          code: `
              import { screen, waitFor } from '@testing-library/react';
              import userEvent from '@testing-library/user-event';
              await waitFor(() => userEvent.click(screen.getByRole('button')));
            `,
          output: `
              import { screen, waitFor } from '@testing-library/react';
              import userEvent from '@testing-library/user-event';
              userEvent.click(screen.getByRole('button'));
            `,
          errors: [{ messageId: 'noSideEffectsWaitFor' }],
        },
        {
          // aliased imports must still be resolved by import, not by the local binding name
          code: `
              import { waitFor as tlWaitFor, fireEvent as tlFireEvent } from '@testing-library/react';
              await tlWaitFor(() => {
                tlFireEvent.click(document.body);
              });
            `,
          output: `
              import { waitFor as tlWaitFor, fireEvent as tlFireEvent } from '@testing-library/react';
              tlFireEvent.click(document.body);
            `,
          errors: [{ messageId: 'noSideEffectsWaitFor' }],
        },
      ],
    });
  });
});
