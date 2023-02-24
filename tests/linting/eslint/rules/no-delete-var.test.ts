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
import { rule } from 'linting/eslint/rules/no-delete-var';
import { RuleTester } from 'eslint';
import { TypeScriptRuleTester } from '../../../tools';

const tests = {
  valid: [
    {
      code: `
        var obj = { a: 1, b: 1};
        delete obj.a;`,
    },
    {
      code: `
        var obj = { a: 1, b: 1};
        delete obj['a'];`,
    },
    {
      code: `
        var arr = [1, 2];
        delete arr[0];`,
    },
    {
      code: `
        var arr = [1, 2];
        var idx = 0;
        delete arr[idx];`,
    },
    {
      code: `
        glob = 5;
        delete glob;
      `,
    },
    {
      code: `
        fun = function () {};
        delete fun;
      `,
    },
    {
      code: `
        var obj = { a: possiblyUndefined() };
        delete obj?.a;`,
    },
  ],
  invalid: [
    {
      code: `
        var v = 1;
        delete v;`,
      errors: [
        {
          message: `Remove this "delete" operator or pass an object property to it.`,
          line: 3,
          endLine: 3,
          column: 9,
          endColumn: 17,
        },
      ],
    },
    {
      code: `
        function fun(p) {
          delete p;
        }`,
      errors: 1,
    },
    {
      code: `delete foo().bar();`,
      errors: 1,
    },
    {
      code: `
        var v = 1;
        delete v + 1;`,
      errors: 1,
    },
    {
      code: `
        var obj = { a: 1, b: 2};
        delete obj;`,
      errors: 1,
    },
  ],
};

const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2021 } });
const ruleTesterTs = new TypeScriptRuleTester();

ruleTesterJs.run('"delete" should be used only with object properties [js]', rule, tests);
ruleTesterTs.run('"delete" should be used only with object properties [ts]', rule, tests);
