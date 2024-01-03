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
import { rule } from './';
import { TypeScriptRuleTester } from '../tools';

const ruleTester = new TypeScriptRuleTester();
ruleTester.run('Array-mutating methods should not be used misleadingly.', rule, {
  valid: [
    {
      code: `
        let a = [];
        let d;
      
        // ok
        a.reverse();
        a?.reverse();
        a && a.sort();
        // ok
        d = a.map(() => true).reverse();
        // ok, there is "slice"
        d = a.slice().reverse().forEach(() => {});

        // ok, excluded
        a = a.reverse();
        a = a.sort();
      `,
    },
    {
      code: `const c = [1, 2, 3].reverse();`,
    },
    {
      code: `
          function foo() {
            const keys = [];
            // fill keys...
            return keys.reverse();
          }
          
          function change(s: string): string {
              return s.split("").reverse().join();
          }
          `,
    },
    {
      code: `
          class Bar {
              field: string[];
            
              public method() {
                // ok
                this.field.reverse();
                // ok
                const c = this.getFieldCopy().reverse();
              }
            
              public getFieldCopy() {
                return [...this.field];
              }
            }`,
    },
    {
      code: `
          class NotArray {
              public reverse() {}
          }
          const notArray = new NotArray();
          // ok
          const notArrayReversed = notArray.reverse();`,
    },
    {
      code: `
            class WithGetter {
                _groups: string[];
              
                public get groups() {
                  return this._groups.slice(0);
                }
              
                public foo() {
                  // ok, using getter
                  const groups = this.groups.reverse();
                  return groups;
                }
            }`,
    },
  ],
  invalid: [
    {
      code: `
        let a = [];
        const b = a?.sort();
        `,
      errors: 1,
    },
    {
      code: `
        let a = [];
        let d;
        const b = a.reverse();
        const bb = a.sort();
        d = a.reverse();
        `,
      errors: [
        {
          message:
            'Move this array "reverse" operation to a separate statement or replace it with "toReversed".',
          line: 4,
          endLine: 4,
          column: 19,
          endColumn: 30,
        },
        {
          message:
            'Move this array "sort" operation to a separate statement or replace it with "toSorted".',
          line: 5,
          endLine: 5,
          column: 20,
          endColumn: 28,
        },
        {
          message:
            'Move this array "reverse" operation to a separate statement or replace it with "toReversed".',
          line: 6,
          endLine: 6,
          column: 13,
          endColumn: 24,
        },
      ],
    },
    {
      code: `
        let b = [];
        const a = b["sort"]()
        const a = b['sort']()
        const a = b["reverse"]()
        const a = b['reverse']()
        `,
      errors: [
        {
          message:
            'Move this array "sort" operation to a separate statement or replace it with "toSorted".',
        },
        {
          message:
            'Move this array "sort" operation to a separate statement or replace it with "toSorted".',
        },
        {
          message:
            'Move this array "reverse" operation to a separate statement or replace it with "toReversed".',
        },
        {
          message:
            'Move this array "reverse" operation to a separate statement or replace it with "toReversed".',
        },
      ],
    },
    {
      code: `function foo() {
            const keys = [];
            // fill keys...
            const x = keys.reverse();
          }`,
      errors: 1,
    },
    {
      code: `function reverseAndJoin() {
                  const a = [1, 2, 3];
                  const x = a.reverse().join();
              }`,
      errors: 1,
    },
    {
      code: `const a = [1, 2, 3];
            function something(a: string[]) {}
            something(a.reverse());`,
      errors: 1,
    },
    {
      code: `class Bar {
          field: string[];
        
          public method() {
            const b = this.field.reverse();
            const bb = this.field.sort();
          }
        }`,
      errors: 2,
    },
    {
      code: `function qux(a: string[][]) {
                   return a.map(b => b.reverse());
              }`,
      errors: 1,
    },
    {
      code: `function foo(a: string[][]) {
                return function(a: string[][]) {
                  let b;
                  b = a.reverse();
              }
            }`,
      errors: 1,
    },
    {
      code: `
        function foo() {
          let a = [];
          return a.length > 0 && a.reverse();
        }`,
      errors: 1,
    },
    {
      code: `
const x = ["foo", "bar", "baz"];
const y = x.sort();`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Replace with "toSorted" method',
              output: `
const x = ["foo", "bar", "baz"];
const y = x.toSorted();`,
            },
          ],
        },
      ],
    },
    {
      code: `
const x = [true, false];
const y = x['reverse']();`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Replace with "toReversed" method',
              output: `
const x = [true, false];
const y = x['toReversed']();`,
            },
          ],
        },
      ],
    },
    {
      code: `
const x = ["foo", "bar", "baz"];
const y = x.sort((a, b) => true);`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Replace with "toSorted" method',
              output: `
const x = ["foo", "bar", "baz"];
const y = x.toSorted((a, b) => true);`,
            },
          ],
        },
      ],
    },
  ],
});
