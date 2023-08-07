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
import { rule } from '@sonar/jsts/rules/strings-comparison';
import { RuleTester } from 'eslint';
import { TypeScriptRuleTester } from '../../../tools';

const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTesterJs.run('Comparison operators should not be used with strings [js]', rule, {
  valid: [
    {
      code: `
      let str1 = 'hello', str2 = 'world';
      str1 < str2; // not reported without type information`,
    },
  ],
  invalid: [],
});

const ruleTesterTs = new TypeScriptRuleTester();
ruleTesterTs.run(`Comparison operators should not be used with strings [ts]`, rule, {
  valid: [
    {
      code: `
        let str1 = 'hello', str2 = 'world';
        str1 == str2;`,
    },
    {
      code: `
        let str = 'hello', num = 5;
        str < num;`,
    },
    {
      code: `
        let str = 'hello', num = 5;
        num < str;`,
    },
    {
      code: `
        let str = 'hello';
        str < 'h';`,
    },
    {
      code: `
        let str = 'hello';
        'h' < str;`,
    },
    {
      code: `
        ['foo', 'bar', 'baz'].sort((a, b) => a < b);
      `,
    },
    {
      code: `
        sort((a: string, b: string) => a < b)
      `,
    },
  ],
  invalid: [
    {
      code: `
        let str1 = 'hello', str2 = 'world';
        str1 < str2;`,
      errors: [
        {
          message:
            '{"message":"Convert operands of this use of \\"<\\" to number type.","secondaryLocations":[{"column":8,"line":3,"endColumn":12,"endLine":3},{"column":15,"line":3,"endColumn":19,"endLine":3}]}',
          line: 3,
          column: 14,
          endLine: 3,
          endColumn: 15,
        },
      ],
    },
    {
      code: `
        let str1 = 'hello', str2 = 'world';
        str1 <= str2;`,
      errors: 1,
    },
    {
      code: `
        let str1 = 'hello', str2 = 'world';
        str1 > str2;`,
      errors: 1,
    },
    {
      code: `
        let str1 = 'hello', str2 = 'world';
        str1 >= str2;`,
      errors: 1,
    },
    {
      code: `
        (function () {})((a: string, b: string) => a < b)
      `,
      errors: 1,
    },
  ],
});
