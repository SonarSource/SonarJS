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

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
import { rule } from '../../src/rules/no-unused-function-argument';

ruleTester.run('Unused function parameters should be removed', rule, {
  valid: [
    {
      code: `function fun(a) {           // OK
              return {a};
            }`,
    },
    {
      code: `function fun(a, b, c) {      // OK, even if b is not used, the last argument is.
              a = 1;
              c = 1;
            }`,
    },
    {
      code: `function fun(a, b) {         // OK, arguments is used inside the function
              a = 1;
              o.call(arguments);
            }`,
    },
    {
      code: `function fun(a) {            // OK
              function nested() {
                a = 1;
              }
            }`,
    },
    {
      code: `each(function fun(a) {       // OK
              a = 1;
            });`,
    },
    {
      code: `class C {
                set value(value) {
                    this.value = value; // OK
                }
            }`,
    },
    {
      code: `var a = {
              set p(v){      // OK
              }
            }`,
    },
  ],
  invalid: [
    {
      code: `function fun(a, b) {
                a = 1;
            }`,
      errors: [
        {
          message: `Remove the unused function parameter "b".`,
          line: 1,
          endLine: 1,
          column: 17,
          endColumn: 18,
        },
      ],
    },
    {
      code: `function fun(a, ...ccc) {
              return a;
            }`,
      errors: [
        {
          message: `Remove the unused function parameter "ccc".`,
          line: 1,
          endLine: 1,
          column: 20,
          endColumn: 23,
        },
      ],
    },
    {
      code: `function fun(p1) { }`,
      errors: 1,
    },
    {
      code: `var f = function(num, num2=1, num3=2) {
              return num === num2;
              }`,
      errors: 1,
    },
    {
      code: `function fun(a, b, c) {
              a = 1;
            }`,
      errors: 2,
    },
    {
      code: `function fun(a, b, c) {
             b = 1;
           }`,
      errors: 1,
    },
    {
      code: `each(function fun(a, b) {
              a = 1;
            });`,
      errors: 1,
    },
    {
      code: `function* fun(a, b) {
              return a;
            }`,
      errors: 1,
    },
    {
      code: `function fun(a, b) { // Noncompliant, arguments is used in the nested function
              a = 1;
              function nested() {
                o.call(arguments);
              }
            }`,
      errors: 1,
    },
    {
      code: `function fun(a) {
              function nested(a) {
                a = 1;
              }
            }`,
      errors: [
        {
          line: 1,
        },
      ],
    },
    {
      code: `function fun() {
              return {
                fun(a) { }
              }
            }`,
      errors: 1,
    },
    {
      code: `var fun = function(
                  par1,
                  par2,
                  par3
            ){ console.log(par1); }`,
      errors: 2,
    },
    {
      code: `watch('!a', (value, previous) => logger.log(value));`,
      errors: 1,
    },
  ],
});
