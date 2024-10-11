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
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';

import Module from 'node:module';
const require = Module.createRequire(import.meta.url);
const tsParserPath = require.resolve('@typescript-eslint/parser');
const ruleTester = new NodeRuleTester({
  parserOptions: { ecmaVersion: 2018 },
  parser: tsParserPath,
});

ruleTester.run(`Functions should use "return" consistently`, rule, {
  valid: [
    {
      code: `
        function empty() {
        }
        
        function one_return_with_value() {
          return 42;
        }
        
        function one_return_without_value() {
          return;
        }
      
        export function toCreateModule() {}
        function allExplicitReturns(p: boolean) {
          if (p) {
            return true;
          } else {
            return false;
          }
        }
        
        function allImplicitReturns(p: boolean) {
          if (p) {
            foo();
          } else {
            return;
          }
        
          function foo() {}
        }
        
        function nestedFunctions() {
          return true;
        
          function foo() {}
        }
        
        function infiniteFor() { // OK, there's no way to get to the end of the function
          for(;;) {
            return 1;
          }
        }
        
        function infiniteWhile() { // OK, there's no way to get to the end of the function
          while (true) {
            return 1;
          }
        }
        
        function explicitUndefinedDeclaration(p: boolean): number | undefined {
          if (p) {
            return 1;
          }
        }
        
        function explicitUndefinedDeclaration1(p: boolean): undefined {
          if (p) {
            return void 0;
          }
        }
        
        function explicitVoidDeclaration1(p: boolean): void | number {
          if (p) {
            return 0;
          }
        }
        
        function explicitVoidDeclaration(p: boolean): void {
          if (p) {
            return void 0;
          }
        }
        
        function explicitVoidDeclaration1(p: boolean): (void | string) | number {
          if (p) {
            return 0;
          }
        }
        
        function withThrowAndExplicitReturn(cond: boolean) {
          if (cond) {
            throw "";
          }
        
          return 42;
        }
        
        function withThrowAndImplicitReturn(cond: boolean) {
          if (cond) {
            throw "";
          }
          console.log("bar");
        }
        
        function with_try() {
          try {
            return 42;
          } catch(e) {
            return true;
          }
        }
        
        function with_try_fn() {
          try {
            return 42;
          } catch(e) {
            foo();
          }
        }
        
        var simple_arrow_function = (a) => 42;
        var arrowWithExpressionBody = (p) => p ? true : false;`,
    },
    {
      code: `
      function withNeverType(a) {
        if (a === 1) {
            return true;
        }
        throw new Error('False')
      }`,
    },
    {
      code: `
      function throwError(message: string): never {
        throw new Error(message);
      }
      function withNeverType(a): boolean | never {
        if (a === 1) {
            return true;
        }
        throwError('False')
      }
    `,
    },
  ],
  invalid: [
    {
      code: `
        export function inconsistent(p: boolean) {
          if (p) {
            return true;
          }
        }`,
      errors: [
        {
          message:
            '{"message":"Refactor this function to use \\"return\\" consistently.","secondaryLocations":[{"message":"Return with value","column":12,"line":4,"endColumn":24,"endLine":4},{"message":"Implicit return without value","column":8,"line":6,"endColumn":9,"endLine":6}]}',
          line: 2,
          endLine: 2,
          column: 25,
          endColumn: 37,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
        var function_expression = function () {
          if (condition) {
            return 42;
          }
        }`,
      errors: [
        {
          message:
            '{"message":"Refactor this function to use \\"return\\" consistently.","secondaryLocations":[{"message":"Return with value","column":12,"line":4,"endColumn":22,"endLine":4},{"message":"Implicit return without value","column":8,"line":6,"endColumn":9,"endLine":6}]}',
          line: 2,
          endLine: 2,
          column: 35,
          endColumn: 43,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `var inconsistentArrow = (p) => {if (p) { return true; } return; };`,
      errors: [
        {
          message:
            '{"message":"Refactor this function to use \\"return\\" consistently.","secondaryLocations":[{"message":"Return with value","column":41,"line":1,"endColumn":53,"endLine":1},{"message":"Return without value","column":56,"line":1,"endColumn":63,"endLine":1}]}',
          line: 1,
          endLine: 1,
          column: 29,
          endColumn: 31,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
        function* inconsistentGenerator(p) {
          let i = 0
          while(i < 10) {
            yield i++;
          }
          if (p) {
            return true;
          }
        }`,
      errors: [
        {
          message:
            '{"message":"Refactor this function to use \\"return\\" consistently.","secondaryLocations":[{"message":"Return with value","column":12,"line":8,"endColumn":24,"endLine":8},{"message":"Implicit return without value","column":8,"line":10,"endColumn":9,"endLine":10}]}',
          line: 2,
          endLine: 2,
          column: 19,
          endColumn: 40,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
        function inconsistentNestedFunctions() {
          return true;
        
          function foo(p: boolean) {
            if (p) {
              return true;
            }
          }
        }`,
      errors: [
        {
          message:
            '{"message":"Refactor this function to use \\"return\\" consistently.","secondaryLocations":[{"message":"Return with value","column":14,"line":7,"endColumn":26,"endLine":7},{"message":"Implicit return without value","column":10,"line":9,"endColumn":11,"endLine":9}]}',
          line: 5,
          endLine: 5,
          column: 20,
          endColumn: 23,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
        class A {
          inconsistentMethod(p) {
            if (p) {
              return true;
            }
          }
        
          *inconsistentGenerator(p) {
            if (p) {
              return;
            }
            return false;
          }
        
          private _value: number;
        
          get value(): number {
            if (this._value) {
              return this._value;
            } else {
              return;
            }
          }
        }`,
      errors: 3,
    },
    {
      code: `
        const myObj = {
          propertyAsFunction() {
             if (this._value) {
              return this._value;
            }
          }
        }`,
      errors: 1,
    },
    // possible FP, see https://github.com/SonarSource/SonarJS/issues/2579
    {
      code: `
      function throwError(message: string): never {
        throw new Error(message);
      }
      function withNeverType(a) {
        if (a === 1) {
            return true;
        }
        throwError('False')
      }
    `,
      errors: 1,
    },
  ],
});
