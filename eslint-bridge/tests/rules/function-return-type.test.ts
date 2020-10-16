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
import { rule } from 'rules/function-return-type';
import { RuleTester } from 'eslint';
import { RuleTesterTs } from '../RuleTesterTs';

const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTesterJs.run('Functions should always return the same type [js]', rule, {
  valid: [
    {
      code: `
        function foo() {
          if (condition) {
            return 42;
          }
          return 'str'; // not raised without type information
        }`,
    },
  ],
  invalid: [],
});

const ruleTesterTs = new RuleTesterTs();
ruleTesterTs.run(`Functions should always return the same type [ts]`, rule, {
  valid: [
    {
      code: `return;`,
    },
    {
      code: `
        function foo() {
        }`,
    },
    {
      code: `
        function foo() {
          if (condition) {
            return 42;
          } else {
            return;
          }
        }`,
    },
    {
      code: `
        function foo() {
          if (condition) {
            return 42;
          }
        }`,
    },
    {
      code: `
        function foo() {
          if (condition) {
            return 42;
          } else {
            return 24;
          }
        }`,
    },
    {
      code: `
        function foo() {
          if (condition) {
            return 'hello';
          } else {
            return 'world';
          }
        }`,
    },
    {
      code: `
        function foo() {
          if (condition) {
            return true;
          } else {
            return false;
          }
        }`,
    },
    {
      code: `
        function foo() {
          if (condition) {
            return { num: 42 };
          } else {
            return { str: 'hello' };
          }
        }`,
    },
    {
      code: `
        function foo() {
          if (condition) {
            return [1, 2, 3];
          } else {
            return [4, 5, 6];
          }
        }`,
    },
    {
      code: `
        function foo() {
          if (condition) {
            return function (){};
          } else {
            return function (){};
          }
        }`,
    },
    {
      code: `
        function foo() {
          if (condition) {
            return new Date();
          } else {
            return new Date();
          }
        }`,
    },
    {
      code: `
        function foo() {
          if (condition1) {
            return 42;
          } else if (condition2) {
            return null;
          } else {
            return undefined;
          }
        }`,
    },
    {
      code: `
        function foo() {
          if (condition) {
            return 42;
          } else {
            return any();
          }
        }`,
    },
    {
      code: `
        function foo() {
          let ret;
          if (condition) {
            ret = 42;
          } else {
            ret = 'str';
          }
          return ret // FN - does not infer ret to number | string;
        }`,
    },
    {
      code: `
        class A {}
        class B extends A {}
        function Factory() {
          if (condition) {
            return new A();
          } else {
            return new B();
          }
        }`,
    },
    {
      code: `
        /** @returns {(number|string)} - a union of number and string */
        function foo() {
          if (condition) {
            return 42;
          }
          return 'str';
        }`,
    },
  ],
  invalid: [
    {
      code: `
        function foo() {
          if (condition) {
            return 42;
          }
          return 'str';
        }`,
      errors: [
        {
          message: JSON.stringify({
            message: `Refactor this function to always return the same type.`,
            secondaryLocations: [
              {
                message: `Returns number`,
                column: 12,
                line: 4,
                endColumn: 22,
                endLine: 4,
              },
              {
                message: `Returns string`,
                column: 10,
                line: 6,
                endColumn: 23,
                endLine: 6,
              },
            ],
          }),
          line: 2,
          column: 18,
          endLine: 2,
          endColumn: 21,
        },
      ],
    },
    {
      code: `
        function foo() {
          if (condition) {
            return 42;
          }
          return { foo: 'bar' };
        }`,
      errors: [
        {
          message: JSON.stringify({
            message: `Refactor this function to always return the same type.`,
            secondaryLocations: [
              {
                message: `Returns number`,
                column: 12,
                line: 4,
                endColumn: 22,
                endLine: 4,
              },
              {
                message: `Returns object`,
                column: 10,
                line: 6,
                endColumn: 32,
                endLine: 6,
              },
            ],
          }),
          line: 2,
          column: 18,
          endLine: 2,
          endColumn: 21,
        },
      ],
    },
    {
      code: `
        function foo() {
          if (condition1) {
            return;
          } else if (condition2) {
            return null;
          } else if (condition3) {
            return undefined;
          } else if (condition4) {
            return 42;
          } else {
            return 'str';
          }
        }`,
      errors: [
        {
          message: JSON.stringify({
            message: `Refactor this function to always return the same type.`,
            secondaryLocations: [
              {
                message: `Returns number`,
                column: 12,
                line: 10,
                endColumn: 22,
                endLine: 10,
              },
              {
                message: `Returns string`,
                column: 12,
                line: 12,
                endColumn: 25,
                endLine: 12,
              },
            ],
          }),
          line: 2,
          column: 18,
          endLine: 2,
          endColumn: 21,
        },
      ],
    },
    {
      code: `
        function foo() {
          return condition ? 'str' : true;
        }`,
      errors: 1,
    },
    {
      code: `
        class C {
          m() {
            if (condition) {
              return 42;
            } else {
              return 'str';
            }
          }
        }`,
      errors: 1,
    },
    {
      code: `
        class A {}
        class B {}
        function Factory() {
          if (condition) {
            return new A();
          } else {
            return new B();
          }
        }`,
      errors: 1,
    },
    {
      code: `
        function foo() {
          if (condition) {
            return [1, 2, 3];
          } else {
            return ['foo', 'bar', 'baz'];
          }
        }`,
      errors: 1,
    },
    {
      code: `
        /** @param {(number|string)} - a union of number and string */
        function foo() {
          if (condition) {
            return 42;
          }
          return 'str';
        }`,
      errors: 1,
    },
  ],
});
