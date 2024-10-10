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
import { rule } from './index.js';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run('Exception should not be created without being thrown', rule, {
  valid: [
    {
      code: `foo(new Error());`,
    },
    {
      code: `foo(TypeError);`,
    },
    {
      code: `throw new Error();`,
    },
    {
      code: `new LooksLikeAnError().doSomething();`,
    },
  ],
  invalid: [
    {
      code: `new Error();`,
      errors: [
        {
          message: 'Throw this error or remove this useless statement.',
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 12,
          suggestions: [
            {
              desc: 'Throw this error',
              output: 'throw new Error();',
            },
          ],
        },
      ],
    },
    {
      code: `new TypeError();`,
      errors: 1,
    },
    {
      code: `new MyError();`,
      errors: 1,
    },
    {
      code: `new A.MyError();`,
      errors: 1,
    },
    {
      code: `new A(function () {
                new SomeError();
            });`,
      errors: 1,
    },
    {
      code: `(new MyException());`,
      errors: [{ suggestions: [{ output: 'throw (new MyException());' }] }],
    },
  ],
});
