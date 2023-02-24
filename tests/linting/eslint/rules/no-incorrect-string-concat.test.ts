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
import { TypeScriptRuleTester } from '../../../tools';
import { rule } from 'linting/eslint/rules/no-incorrect-string-concat';

const ruleTesterTs = new TypeScriptRuleTester();
ruleTesterTs.run('', rule, {
  valid: [
    {
      code: `function literal_type(param) {
        var str = '42';
        (param ? 'a' : 'b') + str;
      }`,
    },
    {
      code: `function assignable_to_string(param, obj: object, maybeStr: string | Object) {
        var str = '42';
        str + param; 
        str + obj;
        str + maybeStr;
      }`,
    },
    {
      code: `
      var str = "42";
      var num = 1;
      return "foo" + num + "bar" + num;
      `,
    },
    {
      code: `42 + 42`,
    },
    {
      code: `"a" + "b"`,
    },
    {
      code: `"a" + 42`, // excluding string literals
    },
    {
      code: `
      var str = "42";
      var num = 1;
      // cast string operand to number
      foo(num + Number(str));   // Compliant
      foo(num + parseInt(str));   // Compliant

      // cast non-string operand to string
      foo('' + num + str);   // Compliant
      foo(num.toString() + str);   // Compliant
      `,
    },
    {
      code: `
      function bar1(str) {
        foo(1 + str);  // FN
      }
      bar1("42");`,
    },
    {
      code: `
      var str = "42";
      var num = 1;
      num * str`,
    },
    {
      code: `
      declare enum E { X, Y }
      const a = 1 + E.X;
      `,
    },
  ],
  invalid: [
    {
      code: `
      var str = "42";
      var num = 1;
      num + str`,
      errors: [
        {
          message: JSON.stringify({
            message: `Review this expression to be sure that the concatenation was intended.`,
            secondaryLocations: [
              {
                message: `left operand has type number.`,
                column: 6,
                line: 4,
                endColumn: 9,
                endLine: 4,
              },
              {
                message: `right operand has type string.`,
                column: 12,
                line: 4,
                endColumn: 15,
                endLine: 4,
              },
            ],
          }),
          line: 4,
          endLine: 4,
          column: 11,
          endColumn: 12,
        },
      ],
    },
    {
      code: `
      var str = "42";
      var num = 1;
      str + num`,
      errors: 1,
    },
    {
      code: `
      var str = "42";
      var num = 1;
      num * 5 + str`,
      errors: 1,
    },
    {
      code: `
      var str = "42";
      var obj = {
        num : 1,
        str : "42"
      }
      foo(obj + str);     // Noncompliant
      foo(obj.num + str); // Noncompliant
      foo(obj.str + str); // Compliant`,
      errors: [
        {
          line: 7,
        },
        {
          line: 8,
        },
      ],
    },
  ],
});
