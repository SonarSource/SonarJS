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
import { Scope } from 'eslint';
import { isParameterProperty, rule } from './rule.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';

import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';

describe('S1172', () => {
  it('S1172', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('Unused function parameters should be removed', rule, {
      valid: [
        {
          code: `function fun(a) {           // OK
              return {a};
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
        {
          code: `function fun(_a, b, _c) {
        b = 5;
      }`,
        },
        {
          code: `
      class C {
        constructor(readonly a: number) {} // OK, a is a parameter property
      }
      `,
        },
        {
          code: `
        class D {
          constructor(
            public readonly a: number = 42,
            public b: string = 'foo',
            protected readonly c: number = Math.random(),
            protected d: boolean = true,
            private readonly e: object = {},
            private f: string[] = [],
          ) {} // OK, all parameter properties with assignment
        }`,
        },
        {
          code: `function fun(this: void) {}`,
        },
        {
          code: `
        function f(Tag) {
          return <Tag />
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
              message: `Remove the unused function parameter "b" or rename it to "_b" to make intention explicit.`,
              line: 1,
              endLine: 1,
              column: 17,
              endColumn: 18,
              suggestions: [
                {
                  output: `function fun(a, _b) {
                a = 1;
            }`,
                  desc: 'Rename "b" to "_b"',
                },
                {
                  output: `function fun(a) {
                a = 1;
            }`,
                  desc: 'Remove "b" (beware of call sites)',
                },
              ],
            },
          ],
        },
        {
          code: `function fun(a, ...ccc) {
              return a;
            }`,
          errors: [
            {
              message: `Remove the unused function parameter "ccc" or rename it to "_ccc" to make intention explicit.`,
              line: 1,
              endLine: 1,
              column: 20,
              endColumn: 23,
              suggestions: [
                {
                  output: `function fun(a, ..._ccc) {
              return a;
            }`,
                  desc: 'Rename "ccc" to "_ccc"',
                },
              ],
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
          errors: [
            {
              message:
                'Remove the unused function parameter "a" or rename it to "_a" to make intention explicit.',
              suggestions: [
                {
                  output: `function fun(_a, b, c) {
             b = 1;
           }`,
                  desc: 'Rename "a" to "_a"',
                },
                {
                  output: `function fun(b, c) {
             b = 1;
           }`,
                  desc: 'Remove "a" (beware of call sites)',
                },
              ],
            },
            {
              message:
                'Remove the unused function parameter "c" or rename it to "_c" to make intention explicit.',
              suggestions: [
                {
                  output: `function fun(a, b, _c) {
             b = 1;
           }`,
                  desc: 'Rename "c" to "_c"',
                },
                {
                  output: `function fun(a, b) {
             b = 1;
           }`,
                  desc: 'Remove "c" (beware of call sites)',
                },
              ],
            },
          ],
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
              messageId: 'removeOrRenameParameter',
              suggestions: [
                {
                  output: `function fun(_a) {
              function nested(a) {
                a = 1;
              }
            }`,
                  desc: 'Rename "a" to "_a"',
                },
                {
                  output: `function fun() {
              function nested(a) {
                a = 1;
              }
            }`,
                  desc: 'Remove "a" (beware of call sites)',
                },
              ],
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
        {
          code: `function fun(a, b, c) {
              a = 1;
              c = 1;
            }`,
          errors: 1,
        },
        {
          // parameter with type annotation
          code: `function fun(a: T1, b: T2, c: T3) { a = c; }`,
          errors: [
            {
              messageId: 'removeOrRenameParameter',
              suggestions: [
                {
                  desc: 'Rename "b" to "_b"',
                  output: 'function fun(a: T1, _b: T2, c: T3) { a = c; }',
                },
                {
                  desc: 'Remove "b" (beware of call sites)',
                  output: 'function fun(a: T1, c: T3) { a = c; }',
                },
              ],
            },
          ],
        },
        {
          // destructured parameter
          code: `function fun(a, { b }, c) { a = c; }`,
          errors: [
            {
              messageId: 'removeOrRenameParameter',
              suggestions: [
                {
                  desc: 'Rename "b" to "_b"',
                  output: 'function fun(a, { _b }, c) { a = c; }',
                },
              ],
            },
          ],
        },
        {
          // unused parameter first
          code: `function fun(a, b, c) { b = c; }`,
          errors: [
            {
              messageId: 'removeOrRenameParameter',
              suggestions: [
                {
                  desc: 'Rename "a" to "_a"',
                  output: 'function fun(_a, b, c) { b = c; }',
                },
                {
                  desc: 'Remove "a" (beware of call sites)',
                  output: 'function fun(b, c) { b = c; }',
                },
              ],
            },
          ],
        },
        {
          // unused parameter inbetween
          code: `function fun(a, b, c) { a = c; }`,
          errors: [
            {
              messageId: 'removeOrRenameParameter',
              suggestions: [
                {
                  desc: 'Rename "b" to "_b"',
                  output: 'function fun(a, _b, c) { a = c; }',
                },
                {
                  desc: 'Remove "b" (beware of call sites)',
                  output: 'function fun(a, c) { a = c; }',
                },
              ],
            },
          ],
        },
        {
          // unused parameter last
          code: `function fun(a, b, c) { a = b; }`,
          errors: [
            {
              messageId: 'removeOrRenameParameter',
              suggestions: [
                {
                  desc: 'Rename "c" to "_c"',
                  output: 'function fun(a, b, _c) { a = b; }',
                },
                {
                  desc: 'Remove "c" (beware of call sites)',
                  output: 'function fun(a, b) { a = b; }',
                },
              ],
            },
          ],
        },
        {
          // trailing comma
          code: `function fun(a, b, c, ) { a = b; }`,
          errors: [
            {
              messageId: 'removeOrRenameParameter',
              suggestions: [
                {
                  desc: 'Rename "c" to "_c"',
                  output: 'function fun(a, b, _c, ) { a = b; }',
                },
                {
                  desc: 'Remove "c" (beware of call sites)',
                  output: 'function fun(a, b, ) { a = b; }',
                },
              ],
            },
          ],
        },
        {
          // arrow without parentheses
          code: `a => {}`,
          errors: [
            {
              messageId: 'removeOrRenameParameter',
              suggestions: [
                {
                  desc: 'Rename "a" to "_a"',
                  output: '_a => {}',
                },
                {
                  desc: 'Remove "a" (beware of call sites)',
                  output: '() => {}',
                },
              ],
            },
          ],
        },
        {
          // arrow
          code: `a => foo()`,
          errors: [
            {
              messageId: 'removeOrRenameParameter',
              suggestions: [
                {
                  desc: 'Rename "a" to "_a"',
                  output: '_a => foo()',
                },
                {
                  desc: 'Remove "a" (beware of call sites)',
                  output: '() => foo()',
                },
              ],
            },
          ],
        },
        {
          // arrow with parentheses
          code: `( a ) => {}`,
          errors: [
            {
              messageId: 'removeOrRenameParameter',
              suggestions: [
                {
                  desc: 'Rename "a" to "_a"',
                  output: '( _a ) => {}',
                },
                {
                  desc: 'Remove "a" (beware of call sites)',
                  output: '() => {}',
                },
              ],
            },
          ],
        },
        {
          // arrow with trailing comma
          code: `( a, ) => {}`,
          errors: [
            {
              messageId: 'removeOrRenameParameter',
              suggestions: [
                {
                  desc: 'Rename "a" to "_a"',
                  output: '( _a, ) => {}',
                },
                {
                  desc: 'Remove "a" (beware of call sites)',
                  output: '() => {}',
                },
              ],
            },
          ],
        },
        {
          // arrow with return type
          code: `(a): (number | string) => foo()`,
          errors: [
            {
              messageId: 'removeOrRenameParameter',
              suggestions: [
                {
                  desc: 'Rename "a" to "_a"',
                  output: '(_a): (number | string) => foo()',
                },
                {
                  desc: 'Remove "a" (beware of call sites)',
                  output: '(): (number | string) => foo()',
                },
              ],
            },
          ],
        },
      ],
    });

    it('should handle incomplete AST', () => {
      expect(
        isParameterProperty({ defs: [{ name: { parent: {} } }] } as unknown as Scope.Variable),
      ).toBe(false);
      expect(
        isParameterProperty({
          defs: [{ name: { parent: { type: 'AssignmentPattern' } } }],
        } as unknown as Scope.Variable),
      ).toBe(false);
    });
  });
});
