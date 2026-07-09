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

describe('S8981', () => {
  it('S8981 (external: testing-library/no-global-regexp-flag-in-query)', () => {
    ruleTester.run(
      'Regular expressions used in Testing Library queries should not have the global flag',
      rule,
      {
        valid: [
          {
            // no global flag, only case-insensitive
            code: `screen.getByText(/hello/i);`,
          },
          {
            // name option without the global flag
            code: `screen.getByRole('button', { name: /submit/i });`,
          },
          {
            // global flag on a regex not passed to a query — should not be flagged
            code: `const re = /foo/g; someNonQueryFn(re);`,
          },
        ],
        invalid: [
          {
            // direct regex literal argument with the global flag
            code: `screen.getByText(/hello/gi);`,
            output: `screen.getByText(/hello/i);`,
            errors: [{ messageId: 'noGlobalRegExpFlagInQuery' }],
          },
          {
            // regex literal in the "name" option of getByRole
            code: `screen.getByRole('button', { name: /submit/g });`,
            output: `screen.getByRole('button', { name: /submit/ });`,
            errors: [{ messageId: 'noGlobalRegExpFlagInQuery' }],
          },
          {
            // regex held in a variable and passed by reference; the fix is applied at the declaration site
            code: `
              const re = /foo/g;
              screen.getByText(re);
            `,
            output: `
              const re = /foo/;
              screen.getByText(re);
            `,
            errors: [{ messageId: 'noGlobalRegExpFlagInQuery' }],
          },
          {
            // queryBy* family
            code: `screen.queryByText(/hello/g);`,
            output: `screen.queryByText(/hello/);`,
            errors: [{ messageId: 'noGlobalRegExpFlagInQuery' }],
          },
          {
            // findBy* (async) family
            code: `await screen.findByText(/hello/g);`,
            output: `await screen.findByText(/hello/);`,
            errors: [{ messageId: 'noGlobalRegExpFlagInQuery' }],
          },
        ],
      },
    );
  });
});
