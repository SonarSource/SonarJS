/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S3516', () => {
  it('S3516', () => {
    const ruleTester = new RuleTester();

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
                secondaryLocations: [
                  { message: 'Returned value.', column: 21, line: 4, endColumn: 23, endLine: 4 },
                  { message: 'Returned value.', column: 17, line: 6, endColumn: 19, endLine: 6 },
                ],
                cost: 2,
              }),
              line: 2,
              endLine: 2,
              column: 18,
              endColumn: 25,
            },
          ],
          options: ['sonar-runtime'],
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
                secondaryLocations: [
                  { message: 'Returned value.', column: 21, line: 4, endColumn: 26, endLine: 4 },
                  { message: 'Returned value.', column: 21, line: 6, endColumn: 26, endLine: 6 },
                  { message: 'Returned value.', column: 19, line: 8, endColumn: 24, endLine: 8 },
                ],
                cost: 3,
              }),
              line: 2,
              endLine: 2,
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `var arrowNok = (p) => { if (p) { return "foo"; } return "foo"; };`,
          errors: [
            {
              message: JSON.stringify({
                message: 'Refactor this function to not always return the same value.',
                secondaryLocations: [
                  { message: 'Returned value.', column: 40, line: 1, endColumn: 45, endLine: 1 },
                  { message: 'Returned value.', column: 56, line: 1, endColumn: 61, endLine: 1 },
                ],
                cost: 2,
              }),
              line: 1,
              endLine: 1,
            },
          ],
          options: ['sonar-runtime'],
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
                secondaryLocations: [
                  { message: 'Returned value.', column: 21, line: 5, endColumn: 22, endLine: 5 },
                  { message: 'Returned value.', column: 17, line: 7, endColumn: 18, endLine: 7 },
                ],
                cost: 2,
              }),
              line: 2,
              endLine: 2,
            },
          ],
          options: ['sonar-runtime'],
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
                secondaryLocations: [
                  { message: 'Returned value.', column: 19, line: 5, endColumn: 24, endLine: 5 },
                  { message: 'Returned value.', column: 17, line: 9, endColumn: 22, endLine: 9 },
                ],
                cost: 2,
              }),
              line: 2,
              endLine: 2,
            },
          ],
          options: ['sonar-runtime'],
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
                secondaryLocations: [
                  { message: 'Returned value.', column: 21, line: 4, endColumn: 23, endLine: 4 },
                  { message: 'Returned value.', column: 17, line: 7, endColumn: 19, endLine: 7 },
                ],
                cost: 2,
              }),
              line: 2,
              endLine: 2,
            },
          ],
          options: ['sonar-runtime'],
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
                secondaryLocations: [
                  { message: 'Returned value.', column: 51, line: 6, endColumn: 53, endLine: 6 },
                  { message: 'Returned value.', column: 64, line: 6, endColumn: 66, endLine: 6 },
                ],
                cost: 2,
              }),
              line: 6,
              endLine: 6,
            },
          ],
          options: ['sonar-runtime'],
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
                secondaryLocations: [
                  { message: 'Returned value.', column: 21, line: 6, endColumn: 22, endLine: 6 },
                  { message: 'Returned value.', column: 17, line: 8, endColumn: 18, endLine: 8 },
                ],
                cost: 2,
              }),
            },
          ],
          options: ['sonar-runtime'],
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
                secondaryLocations: [
                  { message: 'Returned value.', column: 21, line: 8, endColumn: 23, endLine: 8 },
                  { message: 'Returned value.', column: 17, line: 10, endColumn: 19, endLine: 10 },
                ],
                cost: 2,
              }),
            },
          ],
          options: ['sonar-runtime'],
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
                secondaryLocations: [
                  { message: 'Returned value.', column: 23, line: 6, endColumn: 24, endLine: 6 },
                  { message: 'Returned value.', column: 19, line: 8, endColumn: 20, endLine: 8 },
                ],
                cost: 2,
              }),
              line: 3,
              endLine: 3,
            },
          ],
          options: ['sonar-runtime'],
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
  });
});
