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
import path from 'node:path/posix';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './index.js';

const ruleTester = new NoTypeCheckingRuleTester();
const fixtures = (name: string, extension = 'js'): string =>
  path.join(import.meta.dirname, `fixtures/${name}/test.${extension}`);

const directMethods = [
  'clear',
  'click',
  'copy',
  'cut',
  'dblClick',
  'deselectOptions',
  'hover',
  'keyboard',
  'pointer',
  'paste',
  'selectOptions',
  'tripleClick',
  'type',
  'unhover',
  'upload',
  'tab',
] as const;

const directMessage = (name: string): string =>
  `Handle the promise returned by async event method \`${name}\` so the test waits for the interaction to finish.`;

const wrapperMessage = (name: string): string =>
  `Handle the promise returned by \`${name}\` so callers wait for the wrapped interaction to finish.`;

process.chdir(import.meta.dirname);

describe('S9115', () => {
  it('reports every upstream userEvent method with the selected direct message', () => {
    ruleTester.run('Promises returned by Testing Library async events should be handled', rule, {
      valid: [],
      invalid: directMethods.map(name => ({
        code: `
          import userEvent from '@testing-library/user-event';
          userEvent.${name}();
        `,
        filename: fixtures('user-event-v14'),
        errors: [{ message: directMessage(name) }],
      })),
    });
  });

  it('recognizes setup instances and wrappers', () => {
    ruleTester.run('setup instances and wrappers', rule, {
      valid: [],
      invalid: [
        {
          code: `
            import userEvent from '@testing-library/user-event';
            const user = userEvent.setup();
            user.type(input, 'Ada');
          `,
          filename: fixtures('user-event-v14'),
          errors: [{ message: directMessage('type') }],
        },
        {
          code: `
            import userEvent from '@testing-library/user-event';
            const pressEscape = () => userEvent.keyboard('{Escape}');
            pressEscape();
          `,
          filename: fixtures('user-event-v14'),
          errors: [{ message: wrapperMessage('pressEscape') }],
        },
        {
          code: `
            import userEvent from '@testing-library/user-event';
            function getSetup() {
              return { user: userEvent.setup() };
            }
            const { user: alias } = getSetup();
            alias.click(button);
          `,
          filename: fixtures('user-event-v14'),
          errors: [{ message: directMessage('click') }],
        },
      ],
    });
  });

  it('accepts all documented promise-handling forms', () => {
    ruleTester.run('handled promises', rule, {
      valid: [
        {
          code: `
            import userEvent from '@testing-library/user-event';
            await userEvent.click(button);
            function handled() {
              return userEvent.type(input, 'Ada');
            }
            userEvent.copy(input).then(() => {});
            await Promise.all([userEvent.hover(button)]);
            await Promise.allSettled([userEvent.tab()]);
          `,
          filename: fixtures('user-event-v14'),
        },
        {
          code: `
            import userEvent from '@testing-library/user-event';
            const pressEscape = () => userEvent.keyboard('{Escape}');
            await pressEscape();
          `,
          filename: fixtures('user-event-v14'),
        },
      ],
      invalid: [],
    });
  });

  it('keeps the upstream direct and wrapper quickfixes', () => {
    ruleTester.run('quickfixes', rule, {
      valid: [],
      invalid: [
        {
          code: `
            import userEvent from '@testing-library/user-event';
            async function submit() {
              userEvent.click(button);
            }
          `,
          output: `
            import userEvent from '@testing-library/user-event';
            async function submit() {
              await userEvent.click(button);
            }
          `,
          filename: fixtures('user-event-v14'),
          errors: [{ message: directMessage('click') }],
        },
        {
          code: `
            import userEvent from '@testing-library/user-event';
            const pressEscape = () => userEvent.keyboard('{Escape}');
            async function closeDialog() {
              pressEscape();
            }
          `,
          output: `
            import userEvent from '@testing-library/user-event';
            const pressEscape = () => userEvent.keyboard('{Escape}');
            async function closeDialog() {
              await pressEscape();
            }
          `,
          filename: fixtures('user-event-v14'),
          errors: [{ message: wrapperMessage('pressEscape') }],
        },
      ],
    });
  });

  it('does not report fireEvent or unrelated same-name functions', () => {
    ruleTester.run('userEvent-only scope', rule, {
      valid: [
        {
          code: `
            import { fireEvent } from '@testing-library/dom';
            fireEvent.click(button);
          `,
          options: [{ eventModule: 'fireEvent' }],
          filename: fixtures('user-event-v14'),
        },
        {
          code: `
            const userEvent = { click() {} };
            userEvent.click(button);
          `,
          filename: fixtures('user-event-v14'),
        },
      ],
      invalid: [],
    });
  });

  it('gates reports on a known v14 or newer dependency range', () => {
    const code = `
      import userEvent from '@testing-library/user-event';
      userEvent.click(button);
    `;

    ruleTester.run('dependency versions', rule, {
      valid: [
        ...[
          'user-event-v13',
          'user-event-mixed',
          'user-event-unbounded',
          'user-event-latest',
          'user-event-invalid',
        ].map(name => ({ code, filename: fixtures(name) })),
        { code, filename: fixtures('user-event-missing') },
      ],
      invalid: [
        {
          code,
          filename: fixtures('user-event-v14'),
          errors: [{ message: directMessage('click') }],
        },
        {
          code,
          filename: fixtures('user-event-v15'),
          errors: [{ message: directMessage('click') }],
        },
        {
          code,
          filename: fixtures('user-event-minimum'),
          errors: [{ message: directMessage('click') }],
        },
      ],
    });
  });

  it('supports TypeScript syntax without type information', () => {
    ruleTester.run('TypeScript', rule, {
      valid: [],
      invalid: [
        {
          code: `
            import userEvent from '@testing-library/user-event';
            const button = {} as HTMLButtonElement;
            userEvent.click(button);
          `,
          filename: fixtures('user-event-v14', 'ts'),
          errors: [{ message: directMessage('click') }],
        },
      ],
    });
  });
});
