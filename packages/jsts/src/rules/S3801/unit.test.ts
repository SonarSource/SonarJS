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
import { NoTypeCheckingRuleTester, RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S3801', () => {
  it('S3801', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

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
              message: String.raw`{"message":"Refactor this function to use \"return\" consistently.","secondaryLocations":[{"message":"Return with value","column":12,"line":4,"endColumn":24,"endLine":4},{"message":"Implicit return without value","column":8,"line":6,"endColumn":9,"endLine":6}]}`,
              line: 2,
              endLine: 2,
              column: 25,
              endColumn: 37,
            },
          ],
          settings: { sonarRuntime: true },
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
              message: String.raw`{"message":"Refactor this function to use \"return\" consistently.","secondaryLocations":[{"message":"Return with value","column":12,"line":4,"endColumn":22,"endLine":4},{"message":"Implicit return without value","column":8,"line":6,"endColumn":9,"endLine":6}]}`,
              line: 2,
              endLine: 2,
              column: 35,
              endColumn: 43,
            },
          ],
          settings: { sonarRuntime: true },
        },
        {
          code: `var inconsistentArrow = (p) => {if (p) { return true; } return; };`,
          errors: [
            {
              message: String.raw`{"message":"Refactor this function to use \"return\" consistently.","secondaryLocations":[{"message":"Return with value","column":41,"line":1,"endColumn":53,"endLine":1},{"message":"Return without value","column":56,"line":1,"endColumn":63,"endLine":1}]}`,
              line: 1,
              endLine: 1,
              column: 29,
              endColumn: 31,
            },
          ],
          settings: { sonarRuntime: true },
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
              message: String.raw`{"message":"Refactor this function to use \"return\" consistently.","secondaryLocations":[{"message":"Return with value","column":12,"line":8,"endColumn":24,"endLine":8},{"message":"Implicit return without value","column":8,"line":10,"endColumn":9,"endLine":10}]}`,
              line: 2,
              endLine: 2,
              column: 19,
              endColumn: 40,
            },
          ],
          settings: { sonarRuntime: true },
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
              message: String.raw`{"message":"Refactor this function to use \"return\" consistently.","secondaryLocations":[{"message":"Return with value","column":14,"line":7,"endColumn":26,"endLine":7},{"message":"Implicit return without value","column":10,"line":9,"endColumn":11,"endLine":9}]}`,
              line: 5,
              endLine: 5,
              column: 20,
              endColumn: 23,
            },
          ],
          settings: { sonarRuntime: true },
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
        // FP without type information - we can't detect that throwError returns 'never'
        // See JS-106. With type information, this is now fixed (see type-aware tests below)
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
  });

  it('S3801 with type information - exhaustive switch', () => {
    const ruleTester = new RuleTester();

    ruleTester.run(`Functions should use "return" consistently [type-aware]`, rule, {
      valid: [
        {
          // Exhaustive switch over union type - should not raise
          code: `
            type Kind = 'a' | 'b' | 'c';
            function getValue(kind: Kind) {
              switch (kind) {
                case 'a': return 1;
                case 'b': return 2;
                case 'c': return 3;
              }
            }
          `,
        },
        {
          // Exhaustive switch over enum - should not raise
          code: `
            enum Status { Pending, Active, Done }
            function getLabel(status: Status) {
              switch (status) {
                case Status.Pending: return 'pending';
                case Status.Active: return 'active';
                case Status.Done: return 'done';
              }
            }
          `,
        },
        {
          // Exhaustive switch with throw - should not raise
          code: `
            type Action = 'start' | 'stop';
            function execute(action: Action) {
              switch (action) {
                case 'start': return 'started';
                case 'stop': throw new Error('stopped');
              }
            }
          `,
        },
        {
          // Exhaustive switch with block statements - should not raise
          code: `
            type Mode = 'light' | 'dark';
            function getColor(mode: Mode) {
              switch (mode) {
                case 'light': {
                  const color = '#fff';
                  return color;
                }
                case 'dark': {
                  const color = '#000';
                  return color;
                }
              }
            }
          `,
        },
        {
          // Issue JS-90: Exhaustive switch with discriminated union - should not raise
          code: `
            type Circle = { kind: 'circle'; radius: number };
            type Square = { kind: 'square'; size: number };
            type Shape = Circle | Square;

            function getArea(shape: Shape) {
              switch (shape.kind) {
                case 'circle': return Math.PI * shape.radius ** 2;
                case 'square': return shape.size ** 2;
              }
            }
          `,
        },
        {
          // Exhaustive switch with default case - should not raise
          code: `
            type Kind = 'a' | 'b';
            function getValue(kind: Kind) {
              switch (kind) {
                case 'a': return 1;
                default: return 2;
              }
            }
          `,
        },
        {
          // Exhaustive switch with break after return - should not raise
          code: `
            type Kind = 'a' | 'b';
            function getValue(kind: Kind) {
              switch (kind) {
                case 'a':
                  return 1;
                  break;
                case 'b':
                  return 2;
                  break;
              }
            }
          `,
        },
        {
          // Exhaustive switch with nested block returning - should not raise
          code: `
            type Kind = 'a' | 'b';
            function getValue(kind: Kind) {
              switch (kind) {
                case 'a': {
                  {
                    return 1;
                  }
                }
                case 'b':
                  return 2;
              }
            }
          `,
        },
        {
          // Fall-through to last case that returns - should not raise
          // All fall-throughs eventually reach the last case which returns
          code: `
            type Kind = 'a' | 'b';
            function getValue(kind: Kind) {
              switch (kind) {
                case 'a':
                  console.log('a');
                case 'b': return 2;
              }
            }
          `,
        },
        {
          // Issue JS-106: Calling a function that returns 'never' - should not raise
          // The function terminates via the never-returning call, so no implicit return
          code: `
            function throwError(message: string): never {
              throw new Error(message);
            }
            function formatDateOrThrow(value: unknown): string {
              if (value instanceof Date) {
                return value.toISOString();
              }
              throwError('Invalid date');
            }
          `,
        },
        {
          // Calling a never-returning function without explicit return type on caller
          code: `
            function throwError(message: string): never {
              throw new Error(message);
            }
            function withNeverType(a) {
              if (a === 1) {
                return true;
              }
              throwError('False');
            }
          `,
        },
      ],
      invalid: [
        {
          // Calling a function without explicit 'never' return type - should raise
          // TypeScript infers 'void' not 'never' for functions that only throw
          code: `
            function throwErrorNoAnnotation() {
              throw new Error('error');
            }
            function test(a) {
              if (a === 1) {
                return true;
              }
              throwErrorNoAnnotation();
            }
          `,
          errors: 1,
        },
        {
          // Non-exhaustive switch - should raise
          code: `
            type Kind = 'a' | 'b' | 'c';
            function getValue(kind: Kind) {
              switch (kind) {
                case 'a': return 1;
                case 'b': return 2;
                // missing 'c'
              }
            }
          `,
          errors: 1,
        },
        {
          // Switch on non-union type - should raise
          code: `
            function getValue(kind: string) {
              switch (kind) {
                case 'a': return 1;
                case 'b': return 2;
              }
            }
          `,
          errors: 1,
        },
        {
          // Exhaustive but last case doesn't return - should raise
          code: `
            type Kind = 'a' | 'b';
            function getValue(kind: Kind) {
              switch (kind) {
                case 'a': return 1;
                case 'b': console.log('b'); // no return
              }
            }
          `,
          errors: 1,
        },
        {
          // Exhaustive but last case is empty - should raise
          code: `
            type Kind = 'a' | 'b';
            function getValue(kind: Kind) {
              switch (kind) {
                case 'a': return 1;
                case 'b': // empty, falls through to end
              }
            }
          `,
          errors: 1,
        },
      ],
    });
  });
});
