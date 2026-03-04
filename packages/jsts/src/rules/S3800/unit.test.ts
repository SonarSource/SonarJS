/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { rule } from './index.js';
import { DefaultParserRuleTester, RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S3800', () => {
  it('S3800', () => {
    const ruleTesterJs = new DefaultParserRuleTester();
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

    const ruleTesterTs = new RuleTester();
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
        {
          code: `
function isValidCSSColor(str) { // Compliant: single return, union from && / ||
  return str != null && typeof str === 'string' && str.match(/^#[0-9a-fA-F]{3,6}$/)
    || ['red', 'blue', 'green'].indexOf(str) >= 0;
}`,
        },
        {
          code: `
function getLabelOrFail(type) { // Compliant: single return ternary
  return type === 'success' ? 'All good' : false;
}`,
        },
        {
          code: `
function checkMode(mod, o, g, gid, myGid) { // Compliant: single return, bitwise ops
  return mod & o || mod & g && gid === myGid;
}`,
        },
        {
          code: `
const sanitize = () => {
  return condition ? true : 42;
};
`,
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
          return ret;
        }`,
        },
        {
          // Compliant: two returns each producing the same union type (string | boolean)
          // Both branches consistently return the same mixed-type ternary pattern
          code: `
function commandMatch(pressed, mapped) {
  if (mapped.slice(-11) === '<character>') {
    return pressed.length > 0 ? 'full' : false;
  } else {
    return pressed === mapped ? 'full' : false;
  }
}`,
        },
        {
          // Compliant: two returns both boolean, one early return and one via negation
          code: `
function isAssigned(node: any, container: any) {
  if (!node) {
    return false;
  }
  return !!container.check(node);
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
          settings: { sonarRuntime: true },
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
          settings: { sonarRuntime: true },
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
          settings: { sonarRuntime: true },
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
          settings: { sonarRuntime: true },
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
          settings: { sonarRuntime: true },
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
              message: 'Refactor this function to always return the same type.',
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
              message: 'Refactor this function to always return the same type.',
              line: 2,
              column: 12,
              endLine: 2,
              endColumn: 14,
            },
          ],
        },
        {
          // Noncompliant: returns object or false (boolean) - mixed types
          code: `
function getConfig() {
  if (condition) {
    return { host: 'localhost', port: 8080 };
  }
  return false;
}`,
          errors: 1,
        },
        {
          // Noncompliant: validate-style pattern - returns boolean or array
          code: `
function validate() {
  if (!this.validators) {
    return true;
  }
  var invalid = [];
  return invalid;
}`,
          errors: 1,
        },
      ],
    });

    const ruleTestJSWithTypes = new DefaultParserRuleTester();
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
  });
});
