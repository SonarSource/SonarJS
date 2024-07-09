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
import { RuleTester, Scope } from 'eslint';
import { isParameterProperty, rule } from './rule';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2018, ecmaFeatures: { jsx: true } },
});

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
        },
        {
          message:
            'Remove the unused function parameter "c" or rename it to "_c" to make intention explicit.',
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
          suggestions: [
            {
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
          suggestions: [
            {
              output: 'function fun(_a, b, c) { b = c; }',
            },
            {
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
          suggestions: [
            {
              output: 'function fun(a, _b, c) { a = c; }',
            },
            {
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
          suggestions: [
            {
              output: 'function fun(a, b, _c) { a = b; }',
            },
            {
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
          suggestions: [
            {
              output: 'function fun(a, b, _c, ) { a = b; }',
            },
            {
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
          suggestions: [
            {
              output: '_a => {}',
            },
            {
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
          suggestions: [
            {
              output: '_a => foo()',
            },
            {
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
          suggestions: [
            {
              output: '( _a ) => {}',
            },
            {
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
          suggestions: [
            {
              output: '( _a, ) => {}',
            },
            {
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
          suggestions: [
            {
              output: '(_a): (number | string) => foo()',
            },
            {
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
