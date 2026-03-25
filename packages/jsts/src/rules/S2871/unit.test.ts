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
import { RuleTester, NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './rule.js';
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
          // Compliant: order-independent comparison suppressed before type check
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
          // Compliant: Object.keys/getOwnPropertyNames and Map.keys sort (provably technical strings)
          {
            code: `const keys = Object.keys({ a: 1, b: 2 }).sort();`,
          },
          {
            code: `const keys = Object.getOwnPropertyNames({ a: 1, b: 2 }).sort();`,
          },
          {
            code: `
      function f(map: Map<string, number>) {
        return Array.from(map.keys()).sort();
      }
    `,
          },
          // Compliant: for-in key collection pattern typed as string[] by TypeScript
          {
            code: `
      var props = [];
      for (var key in obj) props.push(key);
      props.sort();
    `,
          },
          // Compliant: number array in order-independent equality comparison
          {
            code: `
      function f(a: number[], b: number[]) {
        return a.sort() === b.sort();
      }
    `,
          },
          {
            code: `
      function f(a: number[], b: number[]) {
        return a.sort() !== b.sort();
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
          // Object.keys().map().sort() - Object.keys origin lost after map, should raise
          {
            code: `Object.keys({ a: 1, b: 2 }).map(k => k.toUpperCase()).sort();`,
            errors: [
              {
                messageId: 'provideCompareFunctionForArrayOfStrings',
                suggestions: [
                  {
                    messageId: 'suggestLanguageSensitiveOrder',
                    output: `Object.keys({ a: 1, b: 2 }).map(k => k.toUpperCase()).sort((a, b) => a.localeCompare(b));`,
                  },
                ],
              },
            ],
          },
          // General string arrays: reported with localeCompare suggestion
          {
            code: `const array = ["foo", "bar"]; array.sort();`,
            errors: [
              {
                messageId: 'provideCompareFunctionForArrayOfStrings',
                suggestions: [
                  {
                    messageId: 'suggestLanguageSensitiveOrder',
                    output: `const array = ["foo", "bar"]; array.sort((a, b) => a.localeCompare(b));`,
                  },
                ],
              },
            ],
          },
          {
            code: `
      function f(a: string[]) {
        a?.sort();
      }
    `,
            errors: [
              {
                messageId: 'provideCompareFunctionForArrayOfStrings',
                suggestions: [
                  {
                    messageId: 'suggestLanguageSensitiveOrder',
                    output: `
      function f(a: string[]) {
        a?.sort((a, b) => a.localeCompare(b));
      }
    `,
                  },
                ],
              },
            ],
          },
          {
            code: `['foo', 'bar', 'baz'].sort();`,
            errors: [
              {
                messageId: 'provideCompareFunctionForArrayOfStrings',
                suggestions: [
                  {
                    messageId: 'suggestLanguageSensitiveOrder',
                    output: `['foo', 'bar', 'baz'].sort((a, b) => a.localeCompare(b));`,
                  },
                ],
              },
            ],
          },
          {
            code: `
      function f(a: string[]) {
        a.sort();
      }
    `,
            errors: [
              {
                messageId: 'provideCompareFunctionForArrayOfStrings',
                suggestions: [
                  {
                    messageId: 'suggestLanguageSensitiveOrder',
                    output: `
      function f(a: string[]) {
        a.sort((a, b) => a.localeCompare(b));
      }
    `,
                  },
                ],
              },
            ],
          },
          {
            code: `
      function getString() {
        return 'foo';
      }
      [getString(), getString()].sort();
    `,
            errors: [
              {
                messageId: 'provideCompareFunctionForArrayOfStrings',
                suggestions: [
                  {
                    messageId: 'suggestLanguageSensitiveOrder',
                    output: `
      function getString() {
        return 'foo';
      }
      [getString(), getString()].sort((a, b) => a.localeCompare(b));
    `,
                  },
                ],
              },
            ],
          },
          {
            code: `
      const foo = 'foo';
      const bar = 'bar';
      const baz = 'baz';
      [foo, bar, baz].sort();
    `,
            errors: [
              {
                messageId: 'provideCompareFunctionForArrayOfStrings',
                suggestions: [
                  {
                    messageId: 'suggestLanguageSensitiveOrder',
                    output: `
      const foo = 'foo';
      const bar = 'bar';
      const baz = 'baz';
      [foo, bar, baz].sort((a, b) => a.localeCompare(b));
    `,
                  },
                ],
              },
            ],
          },
          // Array.from(arr.keys()) where arr is number[] returns number[] (array indices),
          // TypeScript correctly identifies this as a number array that needs a comparator
          {
            code: `
        function f(arr: number[]) {
          return Array.from(arr.keys()).sort();
        }
      `,
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [
                  {
                    messageId: 'suggestNumericOrder',
                    output: `
        function f(arr: number[]) {
          return Array.from(arr.keys()).sort((a, b) => (a - b));
        }
      `,
                  },
                ],
              },
            ],
          },
          // Set<string>.keys() yields user-facing strings — not technical keys, must be reported
          {
            code: `
        function f(s: Set<string>) {
          return Array.from(s.keys()).sort();
        }
      `,
            errors: [
              {
                messageId: 'provideCompareFunctionForArrayOfStrings',
                suggestions: [
                  {
                    messageId: 'suggestLanguageSensitiveOrder',
                    output: `
        function f(s: Set<string>) {
          return Array.from(s.keys()).sort((a, b) => a.localeCompare(b));
        }
      `,
                  },
                ],
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
        ],
      },
    );

    const noTypeCheckingRuleTester = new NoTypeCheckingRuleTester();
    noTypeCheckingRuleTester.run(`AST-based suppression works without type checker`, rule, {
      valid: [
        // AST-based suppression: Object.keys/getOwnPropertyNames always return string[]
        { code: `Object.keys({ a: 1 }).sort()` },
        { code: `Object.keys({ a: 1 }).toSorted()` },
        { code: `Object.getOwnPropertyNames({ a: 1 }).sort()` },
        { code: `Object.getOwnPropertyNames({ a: 1 }).toSorted()` },
        // AST-based suppression: order-independent comparison
        { code: `a.sort() === b.sort()` },
        { code: `a.sort() !== b.sort()` },
        { code: `a.toSorted() === b.toSorted()` },
        { code: `a.toSorted() !== b.toSorted()` },
        // AST-based suppression: for-in key collection pattern (semantically equivalent to Object.keys)
        {
          code: `
            var props = [];
            for (var key in obj) props.push(key);
            props.sort();
          `,
        },
        {
          code: `
            var props = [];
            for (var key in this.value) props.push(key);
            return props.sort();
          `,
        },
        // for-in with plain reads (return, etc.) is also suppressed
        {
          code: `
            var props = [];
            for (var key in obj) props.push(key);
            props.sort();
            return props;
          `,
        },
        // for-in with conditional hasOwnProperty guard - push is still inside for-in loop
        {
          code: `
            var keys = [];
            for (var key in obj) {
              if (obj.hasOwnProperty(key)) {
                keys.push(key);
              }
            }
            keys.sort();
          `,
        },
      ],
      invalid: [
        // Without type checker, sort on unknown arrays is still flagged (no suggestions)
        {
          code: `[1, 2, 3].sort()`,
          errors: [{ messageId: 'provideCompareFunction', suggestions: [] }],
        },
        { code: `arr.sort()`, errors: [{ messageId: 'provideCompareFunction', suggestions: [] }] },
        {
          code: `[1, 2, 3].toSorted()`,
          errors: [{ messageId: 'provideCompareFunction', suggestions: [] }],
        },
        // Object.getOwnPropertySymbols returns symbol[], not string[] - must be flagged
        {
          code: `Object.getOwnPropertySymbols(obj).sort()`,
          errors: [{ messageId: 'provideCompareFunction', suggestions: [] }],
        },
        {
          code: `Object.getOwnPropertySymbols(obj).toSorted()`,
          errors: [{ messageId: 'provideCompareFunction', suggestions: [] }],
        },
        // for-in pattern with push outside the loop - still flagged
        {
          code: `
            var arr = [];
            for (var key in obj) arr.push(key);
            arr.push('extra');
            arr.sort();
          `,
          errors: [{ messageId: 'provideCompareFunction', suggestions: [] }],
        },
        // for-in pattern but array not initialized as empty - still flagged
        {
          code: `
            var arr = ['initial'];
            for (var key in obj) arr.push(key);
            arr.sort();
          `,
          errors: [{ messageId: 'provideCompareFunction', suggestions: [] }],
        },
        // for-in pattern but array is reassigned - still flagged
        {
          code: `
            var arr = [];
            for (var key in obj) arr.push(key);
            arr = [1, 2, 3];
            arr.sort();
          `,
          errors: [{ messageId: 'provideCompareFunction', suggestions: [] }],
        },
        // for-in pattern but pushed value is not the loop variable - still flagged
        {
          code: `
            var arr = [];
            for (var key in obj) arr.push(someNumber);
            arr.sort();
          `,
          errors: [{ messageId: 'provideCompareFunction', suggestions: [] }],
        },
        // Foo.from(map.keys()).sort() - non-Array receiver is not suppressed
        {
          code: `Foo.from(map.keys()).sort()`,
          errors: [{ messageId: 'provideCompareFunction', suggestions: [] }],
        },
        {
          code: `Foo.from(map.keys()).toSorted()`,
          errors: [{ messageId: 'provideCompareFunction', suggestions: [] }],
        },
        // Array.from(x.keys()) is not suppressed without type checker:
        // x could be a numeric array or any non-Map iterable
        {
          code: `Array.from(map.keys()).sort()`,
          errors: [{ messageId: 'provideCompareFunction', suggestions: [] }],
        },
        {
          code: `Array.from(map.keys()).toSorted()`,
          errors: [{ messageId: 'provideCompareFunction', suggestions: [] }],
        },
        // Regression: numeric .keys() iterators must still be reported
        {
          code: `Array.from(numArr.keys()).sort()`,
          errors: [{ messageId: 'provideCompareFunction', suggestions: [] }],
        },
        {
          code: `Array.from(numArr.keys()).toSorted()`,
          errors: [{ messageId: 'provideCompareFunction', suggestions: [] }],
        },
      ],
    });

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
          // Compliant: order-independent comparison suppressed before type check
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
          // Compliant: Object.keys/getOwnPropertyNames and Map.keys sort (provably technical strings)
          {
            code: `const keys = Object.keys({ a: 1, b: 2 }).toSorted();`,
          },
          {
            code: `const keys = Object.getOwnPropertyNames({ a: 1, b: 2 }).toSorted();`,
          },
          {
            code: `
      function f(map: Map<string, number>) {
        return Array.from(map.keys()).toSorted();
      }
    `,
          },
          // Compliant: for-in key collection pattern typed as string[] by TypeScript
          {
            code: `
      var props = [];
      for (var key in obj) props.push(key);
      const sorted = props.toSorted();
    `,
          },
          // Compliant: number array in order-independent equality comparison
          {
            code: `
      function f(a: number[], b: number[]) {
        return a.toSorted() === b.toSorted();
      }
    `,
          },
          {
            code: `
      function f(a: number[], b: number[]) {
        return a.toSorted() !== b.toSorted();
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
          // Object.keys().map().toSorted() - Object.keys origin lost after map, should raise
          {
            code: `Object.keys({ a: 1, b: 2 }).map(k => k.toUpperCase()).toSorted();`,
            errors: [
              {
                messageId: 'provideCompareFunctionForArrayOfStrings',
                suggestions: [
                  {
                    messageId: 'suggestLanguageSensitiveOrder',
                    output: `Object.keys({ a: 1, b: 2 }).map(k => k.toUpperCase()).toSorted((a, b) => a.localeCompare(b));`,
                  },
                ],
              },
            ],
          },
          // General string arrays: reported with localeCompare suggestion
          {
            code: `
      function f(a: string[]) {
        return a?.toSorted();
      }
    `,
            errors: [
              {
                messageId: 'provideCompareFunctionForArrayOfStrings',
                suggestions: [
                  {
                    messageId: 'suggestLanguageSensitiveOrder',
                    output: `
      function f(a: string[]) {
        return a?.toSorted((a, b) => a.localeCompare(b));
      }
    `,
                  },
                ],
              },
            ],
          },
          {
            code: `const array = ["foo", "bar"]; const sorted = array.toSorted();`,
            errors: [
              {
                messageId: 'provideCompareFunctionForArrayOfStrings',
                suggestions: [
                  {
                    messageId: 'suggestLanguageSensitiveOrder',
                    output: `const array = ["foo", "bar"]; const sorted = array.toSorted((a, b) => a.localeCompare(b));`,
                  },
                ],
              },
            ],
          },
          {
            code: `
      function f(a: string[]) {
        return a.toSorted();
      }
    `,
            errors: [
              {
                messageId: 'provideCompareFunctionForArrayOfStrings',
                suggestions: [
                  {
                    messageId: 'suggestLanguageSensitiveOrder',
                    output: `
      function f(a: string[]) {
        return a.toSorted((a, b) => a.localeCompare(b));
      }
    `,
                  },
                ],
              },
            ],
          },
          {
            code: `
      const sorted = ['foo', 'bar', 'baz'].toSorted();
    `,
            errors: [
              {
                messageId: 'provideCompareFunctionForArrayOfStrings',
                suggestions: [
                  {
                    messageId: 'suggestLanguageSensitiveOrder',
                    output: `
      const sorted = ['foo', 'bar', 'baz'].toSorted((a, b) => a.localeCompare(b));
    `,
                  },
                ],
              },
            ],
          },
          {
            code: `
      function getString() {
        return 'foo';
      }
      const sorted = [getString(), getString()].toSorted();
    `,
            errors: [
              {
                messageId: 'provideCompareFunctionForArrayOfStrings',
                suggestions: [
                  {
                    messageId: 'suggestLanguageSensitiveOrder',
                    output: `
      function getString() {
        return 'foo';
      }
      const sorted = [getString(), getString()].toSorted((a, b) => a.localeCompare(b));
    `,
                  },
                ],
              },
            ],
          },
          {
            code: `
      const foo = 'foo';
      const bar = 'bar';
      const baz = 'baz';
      const sorted = [foo, bar, baz].toSorted();
    `,
            errors: [
              {
                messageId: 'provideCompareFunctionForArrayOfStrings',
                suggestions: [
                  {
                    messageId: 'suggestLanguageSensitiveOrder',
                    output: `
      const foo = 'foo';
      const bar = 'bar';
      const baz = 'baz';
      const sorted = [foo, bar, baz].toSorted((a, b) => a.localeCompare(b));
    `,
                  },
                ],
              },
            ],
          },
          // Array.from(arr.keys()) where arr is number[] returns number[] (array indices),
          // TypeScript correctly identifies this as a number array that needs a comparator
          {
            code: `
        function f(arr: number[]) {
          return Array.from(arr.keys()).toSorted();
        }
      `,
            errors: [
              {
                messageId: 'provideCompareFunction',
                suggestions: [
                  {
                    messageId: 'suggestNumericOrder',
                    output: `
        function f(arr: number[]) {
          return Array.from(arr.keys()).toSorted((a, b) => (a - b));
        }
      `,
                  },
                ],
              },
            ],
          },
          // Set<string>.keys() yields user-facing strings — not technical keys, must be reported
          {
            code: `
        function f(s: Set<string>) {
          return Array.from(s.keys()).toSorted();
        }
      `,
            errors: [
              {
                messageId: 'provideCompareFunctionForArrayOfStrings',
                suggestions: [
                  {
                    messageId: 'suggestLanguageSensitiveOrder',
                    output: `
        function f(s: Set<string>) {
          return Array.from(s.keys()).toSorted((a, b) => a.localeCompare(b));
        }
      `,
                  },
                ],
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
        ],
      },
    );
  });
});
