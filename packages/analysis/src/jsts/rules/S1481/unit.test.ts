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
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S1481', () => {
  it('S1481 (decorated: typescript-eslint/no-unused-vars)', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('S1481', rule, {
      valid: [
        {
          code: `
            const _unused = 1;
          `,
          options: [{ varsIgnorePattern: '^_' }],
        },
        {
          code: `
            function f(unused, used) {
              return used;
            }

            console.log(f(1, 2));
          `,
        },
        {
          code: `
            const { a, ...rest } = foo;

            console.log(rest);
          `,
        },
        {
          code: `
            function f(_unused, used) {
              return used;
            }

            console.log(f(1, 2));
          `,
          options: [{ args: 'all', argsIgnorePattern: '^_' }],
        },
      ],
      invalid: [
        {
          code: `
            const _unused = 1;
          `,
          errors: [{ message: "'_unused' is assigned a value but never used." }],
        },
        {
          code: `
            function f(_unused, used) {
              return used;
            }

            console.log(f(1, 2));
          `,
          options: [{ args: 'all' }],
          errors: [{ message: "'_unused' is defined but never used." }],
        },
      ],
    });
  });
});
