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
import { rule } from './/index.ts';
import { RuleTester } from 'eslint';
import { JavaScriptRuleTester, TypeScriptRuleTester } from '../../../tests/tools/index.ts';

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

const ruleTesterTs = new TypeScriptRuleTester();
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
        class A {}
        class B {}
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
    {
      code: `
        function bar() {}
        function foo() {
          if (condition) {
            return 42;
          } else {
            return bar();
          }
        }
      `,
    },
    {
      code: `
      function foo(value: any): Object | Array<any> {
        return value;
      }
      `,
    },
    {
      code: `
          function createTypedArrayFactory(type, len) {
            if (type === 'float32') {
              return new Float32Array(len);
            }
            if (type === 'int16') {
              return new Int16Array(len);
            }
            if (type === 'uint8c') {
              return new Uint8ClampedArray(len);
            }
            return Array.from(Array(len));
          }
      `,
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
    },
    {
      code: `
        function foo() {
          return condition ? 'str' : true;
        }`,
    },
    {
      code: `
const sanitize = () => {
  return condition ? true : 'Value should be a string';
};
`,
    },
    {
      code: `
const sanitize = () => {
  if (condition) {
    return true;
  };

  return 'Value should be a string';
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
      options: ['sonar-runtime'],
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
      options: ['sonar-runtime'],
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
      options: ['sonar-runtime'],
    },
    {
      code: `
        function fn() { return 'str'; }
        function foo() {
          if (condition) {
            return 42;
          } else {
            return fn;
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
                line: 5,
                endColumn: 22,
                endLine: 5,
              },
              {
                message: `Returns function`,
                column: 12,
                line: 7,
                endColumn: 22,
                endLine: 7,
              },
            ],
          }),
          line: 3,
          column: 18,
          endLine: 3,
          endColumn: 21,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
        function foo() {
          if (condition1) {
            return 42;
          } else if (condition2) {
            return [ 42 ];
          } else if (condition3) {
            return [ 'str' ];
          } else if (condition4) {
            return [ true ];
          } else {
            return [ { foo: 'bar' } ];
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
                line: 4,
                endColumn: 22,
                endLine: 4,
              },
              {
                message: `Returns array`,
                column: 12,
                line: 6,
                endColumn: 26,
                endLine: 6,
              },
              {
                message: `Returns array`,
                column: 12,
                line: 8,
                endColumn: 29,
                endLine: 8,
              },
              {
                message: `Returns array`,
                column: 12,
                line: 10,
                endColumn: 28,
                endLine: 10,
              },
              {
                message: `Returns array`,
                column: 12,
                line: 12,
                endColumn: 38,
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
      options: ['sonar-runtime'],
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
        /** @param {(number|string)} - a union of number and string */
        function foo() {
          if (condition) {
            return 42;
          }
          return 'str';
        }`,
      errors: 1,
    },
    {
      code: `
        (function () {
          if (condition) {
            return 42;
          }
          return 'str';
        })`,
      errors: [
        {
          line: 2,
          column: 10,
          endLine: 2,
          endColumn: 18,
        },
      ],
    },
    {
      code: `
        () => {
          if (condition) {
            return 42;
          }
          return 'str';
        }`,
      errors: [
        {
          line: 2,
          column: 12,
          endLine: 2,
          endColumn: 14,
        },
      ],
    },
    {
      code: `
const sanitize = () => {
  return condition ? true : 42;
};
`,
      errors: 1,
    },
  ],
});

const ruleTestJSWithTypes = new JavaScriptRuleTester();
ruleTestJSWithTypes.run(
  `'Functions should always return the same type [js with type inference]'`,
  rule,
  {
    valid: [
      {
        code: `
        /**
         * @param {Function|Object} supplier The object or function supplying the properties to be mixed.
         */
        function mix(supplier) {}
        mix({
          f() {
            return this;
          },
        });
        `,
      },
    ],
    invalid: [],
  },
);
