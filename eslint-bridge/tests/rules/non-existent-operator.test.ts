/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
import { rule } from '../../src/rules/non-existent-operator';

ruleTester.run("JavaScript: Non-existent operators '=+', '=-' and '=!' should not be used", rule, {
  valid: [
    {
      code: `
        x = y;
        x += y;
        x = + y;
        x =
           + y;
        x=+y; // Ok - we accept this as some people don't like to use white spaces
        x = - y;
        x /=+ y;
        x = !y;
        let y = + 1;
        y = (!(y));
        const z = + 1;
        other =~ 1;
        `,
    },
  ],
  invalid: [
    {
      code: `x =+ y;`,
      errors: [
        {
          message: `Was "+=" meant instead?`,
          line: 1,
          endLine: 1,
          column: 3,
          endColumn: 5,
        },
      ],
    },
    {
      code: `
      x =- y;`,
      errors: [
        {
          message: `Was "-=" meant instead?`,
          line: 2,
          endLine: 2,
          column: 9,
          endColumn: 11,
        },
      ],
    },
    {
      code: `x =! y;`,
      errors: [
        {
          message: `Was "!=" meant instead?`,
          line: 1,
          endLine: 1,
          column: 3,
          endColumn: 5,
        },
      ],
    },
    {
      code: `const x =! y;`,
      errors: [
        {
          message: `Was "!=" meant instead?`,
          line: 1,
          endLine: 1,
          column: 9,
          endColumn: 11,
        },
      ],
    },
    {
      code: `let x =! y;`,
      errors: [
        {
          message: `Was "!=" meant instead?`,
          line: 1,
          endLine: 1,
          column: 7,
          endColumn: 9,
        },
      ],
    },
  ],
});
