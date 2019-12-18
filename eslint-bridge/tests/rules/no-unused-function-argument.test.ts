/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
import { rule } from "../../src/rules/no-unused-function-argument";

ruleTester.run("Unused function parameters should be removed", rule, {
  valid: [
    {
      code: `function fun(a) {           // OK
              return {a};
            }`,
    },
    {
      code: `function fun(a, b, c) {      // OK
              a = 1;
              c = 1;
            }`,
    },
    {
      code: `function fun(a) {           // OK
              return {a};
            }`,
    },
    {
      code: `function fun(a, b) {         // OK
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
      code: `
      each(function fun(a, b) {    // OK
        b = 1;
      });
      
      each(function fun(a) {       // OK
        a = 1;
      });
      
      each(function fun(a) {       // OK
        return o.call(arguments);
      });`,
    },
    {
      code: `class C {
                set  value(value) {
                    this.value = value; // OK
                }
            }`,
    },
    {
      code: `class C {
              set value(value) {
                  this.value = value; // OK
              }
          }`,
    },
    {
      code: `
      var a = {
        set p(v){      // OK
        },
        get p(){
        }
      }`,
    },
  ],
  invalid: [
    {
      code: `function fun(a, b) {
                a = 1;
            }
      `,
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
            }
      `,
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
      code: `each(function fun(a, b, c) {
              a = 1;
            });`,
      errors: 2,
    },
    {
      code: `each(function fun(a, b) {
              a = 1;
            });`,
      errors: 1,
    },
    {
      code: `each(function fun(p1) {
            });`,
      errors: 1,
    },
    {
      code: `each(function fun(a, b, c) {
             b = 1;
           });`,
      errors: 1,
    },
    {
      code: `each(function* fun(a, b) {
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
      code: `function fun(a, b) {
        a = 1;
        function nested() {
          o.call(arguments);
        }
      }`,
      errors: 1,
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
