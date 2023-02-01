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
import { rule } from 'linting/eslint/rules/call-argument-line';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run(`Function call arguments should not start on new lines`, rule, {
  valid: [
    {
      code: `
        foo(bar);
      `,
    },
    {
      code: `
        foo(bar)(baz)(qux);
      `,
    },
    {
      code: `
        foo(bar)
          (baz)
          (qux);
      `,
    },
    {
      code: `
        foo
          (bar, baz, qux);
      `,
    },
    {
      code: `
      (foo
      )((bar));
      `,
    },
  ],
  invalid: [
    {
      code: `
      foo
        (bar);`,
      errors: [
        {
          message: `Make those call arguments start on line 2.`,
          line: 3,
          endLine: 3,
          column: 9,
          endColumn: 14,
        },
      ],
    },
    {
      code: `(function iieflike(factory){}
      (function () {
          //A lot of code...
        }
      ))`,
      errors: [
        {
          message: `Make those call arguments start on line 1.`,
          line: 2,
          column: 7,
        },
      ],
    },
    {
      code: `
      foo(bar)[baz]
        (qux);
      `,
      errors: 1,
    },
  ],
});
