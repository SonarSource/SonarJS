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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S2871', () => {
  it('S2871', () => {
    const ruleTester = new RuleTester();
    ruleTester.run(
      `A compare function should be provided when using "Array.prototype.sort()"`,
      rule,
      {
        valid: [
          {
            code: `
      var arrayOfNumbers = [80, 3, 9, 34, 23, 5, 1];
      arrayOfNumbers.sort((n, m) => n - m);
      `,
          },
          {
            code: `unknownArrayType.sort();`,
          },
          {
            code: `
      var arrayOfNumbers = [80, 3, 9, 34, 23, 5, 1];
      arrayOfNumbers.custom_sort();
      `,
          },
          {
            code: `
      function f(a: any[]) {
        a.sort(undefined);
      }
    `,
          },
          {
            code: `
      function f(a: any[]) {
        a.sort((a, b) => a - b);
      }
    `,
          },
          {
            code: `
      function f(a: Array<string>) {
        a.sort(undefined);
      }
    `,
          },
          {
            code: `
      function f(a: Array<number>) {
        a.sort((a, b) => a - b);
      }
    `,
          },
          {
            code: `
      function f(a: { sort(): void }) {
        a.sort();
      }
    `,
          },
          {
            code: `
      class A {
        sort(): void {}
      }
      function f(a: A) {
        a.sort();
      }
    `,
          },
          {
            code: `
      interface A {
        sort(): void;
      }
      function f(a: A) {
        a.sort();
      }
    `,
          },
          {
            code: `
      interface A {
        sort(): void;
      }
      function f<T extends A>(a: T) {
        a.sort();
      }
    `,
          },
          {
            code: `
      function f(a: any) {
        a.sort();
      }
    `,
          },
          {
            code: `
      namespace UserDefined {
        interface Array {
          sort(): void;
        }
        function f(a: Array) {
          a.sort();
        }
      }
    `,
          },
          // optional chain
          {
            code: `
      function f(a: any[]) {
        a?.sort((a, b) => a - b);
      }
    `,
          },
          {
            code: `
      namespace UserDefined {
        interface Array {
          sort(): void;
        }
        function f(a: Array) {
          a?.sort();
        }
      }
    `,
          },
          {
            code: `Array.prototype.sort.apply([1, 2, 10])`,
          },
          // Compliant: order-independent comparison
          {
            code: `
      function f(a: string[], b: string[]) {
        return a.sort() === b.sort();
      }
    `,
          },
          {
            code: `
      function f(a: string[], b: string[]) {
        return a.sort() !== b.sort();
      }
    `,
          },
          // Compliant: Object.keys sort
          {
            code: `const keys = Object.keys({ a: 1, b: 2 }).sort();`,
          },
          // Compliant: Map.keys/entries sort
          {
            code: `
      function f(map: Map<string, number>) {
        return Array.from(map.keys()).sort();
      }
    `,
          },
          {
            code: `
      function f(map: Map<string, string>) {
        return Array.from(map.entries()).sort();
      }
    `,
          },
        ],
        invalid: [
          {
            code: `
      var arrayOfNumbers = [80, 3, 9, 34, 23, 5, 1];
      arrayOfNumbers.sort();
      `,
            errors: [
              {
                message: `Provide a compare function to avoid sorting elements alphabetically.`,
                line: 3,
                column: 22,
                endLine: 3,
                endColumn: 26,
                suggestions: [
                  {
                    messageId: 'suggestNumericOrder',
                    output: `
      var arrayOfNumbers = [80, 3, 9, 34, 23, 5, 1];
      arrayOfNumbers.sort((a, b) => (a - b));
      `,
                  },
                ],
              },
            ],
          },
          {
            code: `
      var emptyArrayOfNumbers: number[] = [];
      emptyArrayOfNumbers.sort();
      `,
            errors: 1,
          },
          {
            code: `
      function getArrayOfNumbers(): number[] {}
      getArrayOfNumbers().sort();
      `,
            errors: 1,
          },
          {
            code: `[80, 3, 9, 34, 23, 5, 1].sort();`,
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [
                  {
                    desc: 'Add a comparator function to sort in ascending order',
                    output: '[80, 3, 9, 34, 23, 5, 1].sort((a, b) => (a - b));',
                  },
                ],
              },
            ],
          },
          {
            code: '[Number("1"), Number("2"), Number("10")].sort();',
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [
                  {
                    desc: 'Add a comparator function to sort in ascending order',
                    output: '[Number("1"), Number("2"), Number("10")].sort((a, b) => (a - b));',
                  },
                ],
              },
            ],
          },
          {
            code: '[Number("1"), 2, Number("10")].sort();',
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [
                  {
                    desc: 'Add a comparator function to sort in ascending order',
                    output: '[Number("1"), 2, Number("10")].sort((a, b) => (a - b));',
                  },
                ],
              },
            ],
          },
          {
            code: '["1", 2, "10"].sort();',
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [],
              },
            ],
          },
          {
            code: `[80n, 3n, 9n, 34n, 23n, 5n, 1n].sort();`,
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [
                  {
                    desc: 'Add a comparator function to sort in ascending order',
                    output: `[80n, 3n, 9n, 34n, 23n, 5n, 1n].sort((a, b) => {
  if (a < b) {
    return -1;
  } else if (a > b) {
    return 1;
  } else {
    return 0;
  }
});`,
                  },
                ],
              },
            ],
          },
          {
            code: `
      var arrayOfObjects = [{a: 2}, {a: 4}];
      arrayOfObjects.sort();
      `,
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [],
              },
            ],
          },
          {
            code: `
      interface MyCustomNumber extends Number {}
      const arrayOfCustomNumbers: MyCustomNumber[];
      arrayOfCustomNumbers.sort();
      `,
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [],
              },
            ],
          },
          {
            code: `
        function f(a: Array<any>) {
          a.sort();
        }
      `,
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [],
              },
            ],
          },
          {
            code: `
        function f(a: number[] | string[]) {
          a.sort();
        }
      `,
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [],
              },
            ],
          },
          {
            code: `
        function f<T extends number[]>(a: T) {
          a.sort();
        }
      `,
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [],
              },
            ],
          },
          {
            code: `
        function f<T, U extends T[]>(a: U) {
          a.sort();
        }
      `,
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [],
              },
            ],
          },
          {
            code: 'const array = ["foo", "bar"]; array.sort();',
            errors: [
              {
                messageId: 'provideCompareFunctionForArrayOfStrings',
                suggestions: [
                  {
                    desc: 'Add a comparator function to sort in ascending language-sensitive order',
                    output:
                      'const array = ["foo", "bar"]; array.sort((a, b) => a.localeCompare(b));',
                  },
                ],
              },
            ],
          },
          // optional chain
          {
            code: `
        function f(a: string[]) {
          a?.sort();
        }
      `,
            errors: 1,
          },
          {
            code: `
        ['foo', 'bar', 'baz'].sort();
      `,
            errors: 1,
          },
          {
            code: `
        function getString() {
          return 'foo';
        }
        [getString(), getString()].sort();
      `,
            errors: 1,
          },
          {
            code: `
        const foo = 'foo';
        const bar = 'bar';
        const baz = 'baz';
        [foo, bar, baz].sort();
      `,
            errors: 1,
          },
        ],
      },
    );

    ruleTester.run(
      `A compare function should be provided when using "Array.prototype.toSorted()"`,
      rule,
      {
        valid: [
          {
            code: `
      const arrayOfNumbers = [80, 3, 9, 34, 23, 5, 1];
      const sortedArrayOfNumbers = arrayOfNumbers.toSorted((n, m) => n - m);
      `,
          },
          {
            code: `const sorted = unknownArrayType.toSorted();`,
          },
          {
            code: `
      function f(a: any[]) {
        return a.toSorted(undefined);
      }
    `,
          },
          {
            code: `
      function f(a: any[]) {
        return a.toSorted((a, b) => a - b);
      }
    `,
          },
          {
            code: `
      function f(a: Array<string>) {
        return a.toSorted(undefined);
      }
    `,
          },
          {
            code: `
      function f(a: Array<number>) {
        return a.toSorted((a, b) => a - b);
      }
    `,
          },
          {
            code: `
      function f(a: { toSorted(): void }) {
        return a.toSorted();
      }
    `,
          },
          {
            code: `
      class A {
        toSorted(): void {}
      }
      function f(a: A) {
        return a.toSorted();
      }
    `,
          },
          {
            code: `
      interface A {
        toSorted(): void;
      }
      function f(a: A) {
        return a.toSorted();
      }
    `,
          },
          {
            code: `
      interface A {
        toSorted(): void;
      }
      function f<T extends A>(a: T) {
        return a.toSorted();
      }
    `,
          },
          {
            code: `
      function f(a: any) {
        return a.toSorted();
      }
    `,
          },
          {
            code: `
      namespace UserDefined {
        interface Array {
          toSorted(): void;
        }
        function f(a: Array) {
          return a.toSorted();
        }
      }
    `,
          },
          // optional chain
          {
            code: `
      function f(a: any[]) {
        return a?.toSorted((a, b) => a - b);
      }
    `,
          },
          {
            code: `
      namespace UserDefined {
        interface Array {
          toSorted(): void;
        }
        function f(a: Array) {
          return a?.toSorted();
        }
      }
    `,
          },
          {
            code: `const sorted = Array.prototype.toSorted.apply([1, 2, 10])`,
          },
          // Compliant: order-independent comparison
          {
            code: `
      function f(a: string[], b: string[]) {
        return a.toSorted() === b.toSorted();
      }
    `,
          },
          {
            code: `
      function f(a: string[], b: string[]) {
        return a.toSorted() !== b.toSorted();
      }
    `,
          },
          // Compliant: Object.keys sort
          {
            code: `const keys = Object.keys({ a: 1, b: 2 }).toSorted();`,
          },
          // Compliant: Map.keys sort
          {
            code: `
      function f(map: Map<string, number>) {
        return Array.from(map.keys()).toSorted();
      }
    `,
          },
        ],
        invalid: [
          {
            code: `
      var arrayOfNumbers = [80, 3, 9, 34, 23, 5, 1];
      const sortedArrayOfNumbers = arrayOfNumbers.toSorted();
      `,
            errors: [
              {
                message: `Provide a compare function to avoid sorting elements alphabetically.`,
                line: 3,
                column: 51,
                endLine: 3,
                endColumn: 59,
                suggestions: [
                  {
                    messageId: 'suggestNumericOrder',
                    output: `
      var arrayOfNumbers = [80, 3, 9, 34, 23, 5, 1];
      const sortedArrayOfNumbers = arrayOfNumbers.toSorted((a, b) => (a - b));
      `,
                  },
                ],
              },
            ],
          },
          {
            code: `
      var emptyArrayOfNumbers: number[] = [];
      const sortedEmptyArrayOfNumbers = emptyArrayOfNumbers.toSorted();
      `,
            errors: 1,
          },
          {
            code: `
      function getArrayOfNumbers(): number[] {}
      const sortedArrayOfNumbers = getArrayOfNumbers().toSorted();
      `,
            errors: 1,
          },
          {
            code: `const sortedArrayOfNumbers = [80, 3, 9, 34, 23, 5, 1].toSorted();`,
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [
                  {
                    desc: 'Add a comparator function to sort in ascending order',
                    output:
                      'const sortedArrayOfNumbers = [80, 3, 9, 34, 23, 5, 1].toSorted((a, b) => (a - b));',
                  },
                ],
              },
            ],
          },
          {
            code: 'const sortedArrayOfNumbers = [Number("1"), Number("2"), Number("10")].toSorted();',
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [
                  {
                    desc: 'Add a comparator function to sort in ascending order',
                    output:
                      'const sortedArrayOfNumbers = [Number("1"), Number("2"), Number("10")].toSorted((a, b) => (a - b));',
                  },
                ],
              },
            ],
          },
          {
            code: 'const sortedArrayOfNumbers = [Number("1"), 2, Number("10")].toSorted();',
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [
                  {
                    desc: 'Add a comparator function to sort in ascending order',
                    output:
                      'const sortedArrayOfNumbers = [Number("1"), 2, Number("10")].toSorted((a, b) => (a - b));',
                  },
                ],
              },
            ],
          },
          {
            code: 'const sortedArrayOfNumbers = ["1", 2, "10"].toSorted();',
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [],
              },
            ],
          },
          {
            code: `const sortedArrayOfNumbers = [80n, 3n, 9n, 34n, 23n, 5n, 1n].toSorted();`,
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [
                  {
                    desc: 'Add a comparator function to sort in ascending order',
                    output: `const sortedArrayOfNumbers = [80n, 3n, 9n, 34n, 23n, 5n, 1n].toSorted((a, b) => {
                               if (a < b) {
                                 return -1;
                               } else if (a > b) {
                                 return 1;
                               } else {
                                 return 0;
                               }
                             });`,
                  },
                ],
              },
            ],
          },
          {
            code: `
      var arrayOfObjects = [{a: 2}, {a: 4}];
      const sortedArrayOfObject = arrayOfObjects.toSorted();
      `,
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [],
              },
            ],
          },
          {
            code: `
      interface MyCustomNumber extends Number {}
      const arrayOfCustomNumbers: MyCustomNumber[];
      const sortedArrayOfObject = arrayOfCustomNumbers.toSorted();
      `,
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [],
              },
            ],
          },
          {
            code: `
        function f(a: Array<any>) {
          return a.toSorted();
        }
      `,
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [],
              },
            ],
          },
          {
            code: `
        function f(a: number[] | string[]) {
          return a.toSorted();
        }
      `,
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [],
              },
            ],
          },
          {
            code: `
        function f<T extends number[]>(a: T) {
          return a.toSorted();
        }
      `,
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [],
              },
            ],
          },
          {
            code: `
        function f<T, U extends T[]>(a: U) {
          return a.toSorted();
        }
      `,
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [],
              },
            ],
          },
          {
            code: 'const array = ["foo", "bar"]; const sortedArray = array.toSorted();',
            errors: [
              {
                message:
                  'Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically.',
                suggestions: [
                  {
                    desc: 'Add a comparator function to sort in ascending language-sensitive order',
                    output:
                      'const array = ["foo", "bar"]; const sortedArray = array.toSorted((a, b) => a.localeCompare(b));',
                  },
                ],
              },
            ],
          },
          // optional chain
          {
            code: `
        function f(a: string[]) {
          return a?.toSorted();
        }
      `,
            errors: 1,
          },
          {
            code: `
        const sorted = ['foo', 'bar', 'baz'].toSorted();
      `,
            errors: 1,
          },
          {
            code: `
        function getString() {
          return 'foo';
        }
        const sorted = [getString(), getString()].toSorted();
      `,
            errors: 1,
          },
          {
            code: `
        const foo = 'foo';
        const bar = 'bar';
        const baz = 'baz';
        const sorted = [foo, bar, baz].toSorted();
      `,
            errors: 1,
          },
        ],
      },
    );
  });
});
