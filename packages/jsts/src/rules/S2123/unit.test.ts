/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { rule } from './/index.ts';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run('Values should not be uselessly incremented', rule, {
  valid: [
    {
      code: `i = j++;`,
    },
    {
      code: `i = ++i;`,
    },
    {
      code: `i++;`,
    },
    {
      code: `function f1() {
              let i = 1;
              i++;
            }`,
    },
    {
      code: `let outside = 1;
             function f1() {
               return outside++;
             }`,
    },
    {
      code: `function f1() {
              let i = 1;
              return ++i;
            }`,
    },
  ],
  invalid: [
    {
      code: `i = i++;`,
      errors: [
        {
          message: 'Remove this increment or correct the code not to waste it.',
          line: 1,
          endLine: 1,
          column: 5,
          endColumn: 8,
        },
      ],
    },
    {
      code: `i = i--; `,
      errors: [
        {
          message: 'Remove this decrement or correct the code not to waste it.',
        },
      ],
    },
    {
      code: `function f1() {
              let i = 1;
              return i++;
            }`,
      errors: [
        {
          message: 'Remove this increment or correct the code not to waste it.',
        },
      ],
    },
  ],
});
