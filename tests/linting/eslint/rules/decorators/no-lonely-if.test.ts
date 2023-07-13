/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { RuleTester } from 'eslint';
import { eslintRules } from 'linting/eslint/rules/core';
import { decorateNoLonelyIf } from 'linting/eslint/rules/decorators/no-lonely-if-decorator';

const rule = decorateNoLonelyIf(eslintRules['no-lonely-if']);
const ruleTester = new RuleTester();

ruleTester.run("'If' statement should not be the only statement in 'else' block", rule, {
  valid: [
    {
      code: `
        if (condition) {
          doSomething();
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
        if (condition1) {
          // ...
        } else {
          if (condition2) {
            // ...
          }
        }
      `,
      output: `
        if (condition1) {
          // ...
        } else if (condition2) {
            // ...
          }
      `,
      errors: [
        {
          message: "'If' statement should not be the only statement in 'else' block",
          line: 5,
          endLine: 5,
          column: 11,
          endColumn: 13,
        },
      ],
    },
    {
      code: `
        if (condition3) {
          // ...
        } else {
          if (condition4) {
            // ...
          } else {
            // ...
          }
        }
      `,
      output: `
        if (condition3) {
          // ...
        } else if (condition4) {
            // ...
          } else {
            // ...
          }
      `,
      errors: [
        {
          message: "'If' statement should not be the only statement in 'else' block",
          line: 5,
          endLine: 5,
          column: 11,
          endColumn: 13,
        },
      ],
    },
  ],
});
