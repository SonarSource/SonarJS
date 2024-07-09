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
import { rule } from './';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run('Nested increment (++) and decrement (--) operators should not be used', rule, {
  valid: [
    {
      code: `i++;`,
    },
    {
      code: `++i;`,
    },
    {
      code: `i--;`,
    },
    {
      code: `--i;`,
    },
    {
      code: `foo[i]++;`,
    },
    {
      code: `foo[-i] = 0;`,
    },
    {
      code: `for (i = 0; i < 10; i++, j++, k++) {}`,
    },
  ],
  invalid: [
    {
      code: `for (i++, j-- ; i < 10; i++) {}`,
      errors: [
        {
          message: 'Extract this increment operation into a dedicated statement.',
          line: 1,
          column: 6,
          endLine: 1,
          endColumn: 9,
        },
        {
          message: 'Extract this decrement operation into a dedicated statement.',
          line: 1,
          column: 11,
          endLine: 1,
          endColumn: 14,
        },
      ],
    },
    {
      code: `foo[i--]++;`,
      errors: [
        {
          message: 'Extract this decrement operation into a dedicated statement.',
          line: 1,
          column: 5,
          endLine: 1,
          endColumn: 8,
        },
      ],
    },
    {
      code: `foo[++i] = 0;`,
      errors: 1,
    },
    {
      code: `if (i++) {}`,
      errors: 1,
    },
    {
      code: `console.log(i++);`,
      errors: 1,
    },
    {
      code: `i = 5 * --i;`,
      errors: 1,
    },
    {
      code: `i = i++ - 1;`,
      errors: 1,
    },
    {
      code: `i = (j++, k++);`,
      errors: 2,
    },
    {
      code: `for (i++, j++ ; i < 10; i++) {}`,
      errors: 2,
    },
    {
      code: `for (var i = 0; i++ < 10; i++) {}`,
      errors: 1,
    },
    {
      code: `for (let el of [foo[i++]]) {}`,
      errors: 1,
    },
    {
      code: `for (var i = 0; i < 10; i = j++ - 2, i++) {}`,
      errors: 1,
    },
    {
      code: `while (i++) {}`,
      errors: 1,
    },
    {
      code: `do {} while (i++);`,
      errors: 1,
    },
    {
      code: `() => { return i++; }`,
      errors: 1,
    },
    {
      code: `() => { throw i++; }`,
      errors: 1,
    },
    {
      code: `switch (i++) {
                case j--: break;
                default: break;
              }`,
      errors: 2,
    },
  ],
});
