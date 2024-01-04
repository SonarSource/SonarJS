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
import { rule } from './';

const tsParserPath = require.resolve('@typescript-eslint/parser');
const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2018 },
  parser: tsParserPath,
});

ruleTester.run(`Function returns should not be invariant`, rule, {
  valid: [
    {
      code: `
        function identifiers1(a: number) {
          const c = "foo";
          if (a == 1) {
              return c;
          }
          c += "aa";
          return c;
        }
        
        function identifiers2(a: number) {
          const c = "foo";
          if (a == 1) {
              return c;
          }
          if (a > 5) {
              c += "aa";
          }
          return c;
        }
        
        function identifiers3(a: number) {
          let c;
          if (a == 1) {
              return c;
          }
          c = 1;
          return c;
        }
        
        function identifiers4(a: number) {
          const c = {};
          if (a == 1) {
              return c;
          }
          c.prop1 = "newValue";
          return c;
        }
        
        function identifiers5(a: number) {
          const c = {};
          if (a == 1) {
              return c;
          }
          c.prop1.prop2 = "newValue";
          return c;
        }
        
        function identifiers6(a: number) {
          const c = {};
          if (a == 1) {
              return c;
          }
          c[1] = "newValue";
          return c;
        }
        
        function identifiers7(a: number) {
          const c = {};
          if (a == 1) {
              return c;
          }
          c['abcde'] = "newValue";
          return c;
        }
        
        function identifiers8(a: number) {
          const c = {};
          if (a == 1) {
              return c;
          }
          c['abcde'].prop1[2].prop2 = "newValue";
          return c;
        }
        
        function identifiers9(a: number) {
          const c = {};
          if (a == 1) {
              return c;
          }
          c.doSomething(); // Ok - we don't know whether state of c was updated or not 
          return c;
        }
        
        function identifiers10(a: number) {
          const c = {};
          if (a == 1) {
            return c;
          }
          doSomething(c); // Ok - we don't know whether state of c was updated or not
          return c;
        }`,
    },
    {
      code: `
        function oneReturnValue() {
            return 1;
        }
        
        function withImplicitReturn(p: boolean) {
            if (p) {
                return 2;
            } else if (!p) {
                return 2;
            }
        }
        
        function differentValues(p: boolean) {
            if (p) {
                return 10;
            } else {
                return 11;
            }
        }
        
        function withUnaryExpression(p: boolean) {
            if (p) {
                return !1;
            } else {
                return 1;
            }
        }
        
        function allImplicitReturns(p: boolean) {
            if (p) {
                foo();
            } else {
                return;
            }
        
            function foo() { }
        }
        
        function explicitUndefinedDeclaration(p: boolean): number | undefined {
            if (p) {
                return 1;
            }
        }
        
        function empty() {
        
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
        
        function withThrowAndExplicitReturn(cond: boolean, cond2: boolean) {
            if (cond) {
                throw 42;
            }
            if (cond2) {
                return 42;
            }
            return 42;
        }
        
        function withThrowAndImplicitReturn(cond: boolean) {
            if (cond) {
                throw "";
            }
            console.log("bar");
        }
        
        var arrowWithExpressionBody = p => p ? 1 : 1;
        
        function sameSymbolicValueSameConstraint(p) { // FN - not using SE
          var num = foo() - bar();
          var num2 = num;
          if (p) {
            return num;
          } else {
            return num2;
          }
        }`,
    },
  ],
  invalid: [
    {
      code: `
        function numbers(a: number) {
          if (a == 1) {
              return 42;
          }
          return 42;
        }`,
      errors: [
        {
          message: JSON.stringify({
            message: 'Refactor this function to not always return the same value.',
            cost: 2,
            secondaryLocations: [
              { message: 'Returned value.', column: 21, line: 4, endColumn: 23, endLine: 4 },
              { message: 'Returned value.', column: 17, line: 6, endColumn: 19, endLine: 6 },
            ],
          }),
          line: 2,
          endLine: 2,
          column: 18,
          endColumn: 25,
        },
      ],
    },
    {
      code: `
        function strings(a: number) {
            if (a == 1) {
              return "foo";
            } else if (a > 10) {
              return "foo";
            }
            return "foo";
        }`,
      errors: [
        {
          message: JSON.stringify({
            message: 'Refactor this function to not always return the same value.',
            cost: 3,
            secondaryLocations: [
              { message: 'Returned value.', column: 21, line: 4, endColumn: 26, endLine: 4 },
              { message: 'Returned value.', column: 21, line: 6, endColumn: 26, endLine: 6 },
              { message: 'Returned value.', column: 19, line: 8, endColumn: 24, endLine: 8 },
            ],
          }),
          line: 2,
          endLine: 2,
        },
      ],
    },
    {
      code: `var arrowNok = (p) => { if (p) { return "foo"; } return "foo"; };`,
      errors: [
        {
          message: JSON.stringify({
            message: 'Refactor this function to not always return the same value.',
            cost: 2,
            secondaryLocations: [
              { message: 'Returned value.', column: 40, line: 1, endColumn: 45, endLine: 1 },
              { message: 'Returned value.', column: 56, line: 1, endColumn: 61, endLine: 1 },
            ],
          }),
          line: 1,
          endLine: 1,
        },
      ],
    },
    {
      code: `
        function identifiers(a: number) {
          const c = "foo";
          if (a == 1) {
              return c;
          }
          return c;
        }`,
      errors: [
        {
          message: JSON.stringify({
            message: 'Refactor this function to not always return the same value.',
            cost: 2,
            secondaryLocations: [
              { message: 'Returned value.', column: 21, line: 5, endColumn: 22, endLine: 5 },
              { message: 'Returned value.', column: 17, line: 7, endColumn: 18, endLine: 7 },
            ],
          }),
          line: 2,
          endLine: 2,
        },
      ],
    },
    {
      code: `
        function identifiers(count) {
          count -= 1;
          if (count <= 0) {
            return count;
          }
        
          const var2 = doSomethingElse();
          return count;
        }`,
      errors: [
        {
          message: JSON.stringify({
            message: 'Refactor this function to not always return the same value.',
            cost: 2,
            secondaryLocations: [
              { message: 'Returned value.', column: 19, line: 5, endColumn: 24, endLine: 5 },
              { message: 'Returned value.', column: 17, line: 9, endColumn: 22, endLine: 9 },
            ],
          }),
          line: 2,
          endLine: 2,
        },
      ],
    },
    {
      code: `
        function numbers(a: number) {
          if (a == 1) {
              return 42;
          }
          var arrowNull = (p) => { if (p) { return null; } return ""; };
          return 42;
        }`,
      errors: [
        {
          message: JSON.stringify({
            message: 'Refactor this function to not always return the same value.',
            cost: 2,
            secondaryLocations: [
              { message: 'Returned value.', column: 21, line: 4, endColumn: 23, endLine: 4 },
              { message: 'Returned value.', column: 17, line: 7, endColumn: 19, endLine: 7 },
            ],
          }),
          line: 2,
          endLine: 2,
        },
      ],
    },
    {
      code: `
        function numbers(a: number) {
          if (a == 1) {
              return 42;
          }
          var arrowNull = (p) => { if (p) { return ""; } return ""; };
          return "";
        }`,
      errors: [
        {
          message: JSON.stringify({
            message: 'Refactor this function to not always return the same value.',
            cost: 2,
            secondaryLocations: [
              { message: 'Returned value.', column: 51, line: 6, endColumn: 53, endLine: 6 },
              { message: 'Returned value.', column: 64, line: 6, endColumn: 66, endLine: 6 },
            ],
          }),
          line: 6,
          endLine: 6,
        },
      ],
    },
    {
      code: `
        function identifiers(a: number) {
          let c;
          c = 1;
          if (a == 1) {
              return c;
          }
          return c;
        }`,
      errors: [
        {
          message: JSON.stringify({
            message: 'Refactor this function to not always return the same value.',
            cost: 2,
            secondaryLocations: [
              { message: 'Returned value.', column: 21, line: 6, endColumn: 22, endLine: 6 },
              { message: 'Returned value.', column: 17, line: 8, endColumn: 18, endLine: 8 },
            ],
          }),
        },
      ],
    },
    {
      code: `
        function withThrowAndExplicitReturn(cond: boolean, cond2: boolean) {
          try {
              throw 42;
          } catch(e) {}
          
          if (cond2) {
              return 42;
          }
          return 42;
        }`,
      errors: [
        {
          message: JSON.stringify({
            message: 'Refactor this function to not always return the same value.',
            cost: 2,
            secondaryLocations: [
              { message: 'Returned value.', column: 21, line: 8, endColumn: 23, endLine: 8 },
              { message: 'Returned value.', column: 17, line: 10, endColumn: 19, endLine: 10 },
            ],
          }),
        },
      ],
    },
    {
      code: `
        registerFunction(
          function() {
            const c = "foo";
            if (a == 1) {
                return c;
            }
            return c;
          });`,
      errors: [
        {
          message: JSON.stringify({
            message: 'Refactor this function to not always return the same value.',
            cost: 2,
            secondaryLocations: [
              { message: 'Returned value.', column: 23, line: 6, endColumn: 24, endLine: 6 },
              { message: 'Returned value.', column: 19, line: 8, endColumn: 20, endLine: 8 },
            ],
          }),
          line: 3,
          endLine: 3,
        },
      ],
    },
    {
      code: `
        var arrowNull = (p) => { if (p) { return null; } return null; };
        var arrowBoolean = (p) => { if (p) { return true; } return true; };
        var arrowEquivalent1 = (p) => { if (p) { return !true; } return false; };
        var arrowEquivalent2 = (p) => { if (p) { return 2; } return +2; };
        var arrowEquivalent3 = (p) => { if (p) { return 2; } return +(+2); };
        var arrowEquivalent4 = (p) => { if (p) { return !1; } return false; };
        var arrowEquivalent5 = (p) => { if (p) { return "boolean"; } return typeof false; };
        var arrowEquivalent6 = (p) => { if (p) { return ~4; } return -5; };`,
      errors: 8,
    },
  ],
});
