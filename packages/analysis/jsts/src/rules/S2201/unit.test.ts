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
import { rule } from './rule.js';
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S2201', () => {
  it('S2201', () => {
    const ruleTester = new RuleTester();

    ruleTester.run(
      'Return values from functions without side effects should not be ignored',
      rule,
      {
        valid: [
          {
            code: `
      function returnIsNotIgnored() {
        var x = "abc".concat("bcd");

        if ([1, 2, 3].lastIndexOf(42)) {
          return true;
        }
      }`,
          },
          {
            code: `
      function noSupportForUserTypes() {
        class A {
          methodWithoutSideEffect() {
            return 42;
          }
        }

        (new A()).methodWithoutSideEffect(); // OK
      }`,
          },
          {
            code: `
      function unknownType(x: any) {
        x.foo();
      }`,
          },
          {
            code: `
      function computedPropertyOnDestructuring(source: any, property: string) { // OK, used as computed property name
        const { [property]: _, ...rest } = source;
        return rest;
      }`,
          },
          {
            code: `
      // "some" and "every" are sometimes used to provide early termination for loops
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
      [1, 2, 3].some(function(el) {
        return el === 2;
      });

      [1,2,3].every(function(el) {
        return ! el !== 2;
      });
            `,
          },
          {
            code: `
      function methodsOnString() {
        // "replace" with callback is OK
        "abc".replace(/ab/, () => "");
        "abc".replace(/ab/, function() {return ""});
      }`,
          },
          {
            code: `
      function myCallBack() {}
      function methodsOnString() {
        // "replace" with callback is OK
        "abc".replace(/ab/, myCallBack);
      }`,
          },
          {
            // find() with assignment to outer variable exploits early-exit (FP fix)
            code: `
      const items: number[] = [1, 2, 3, 4, 5];
      let found: number | undefined;
      items.find(x => {
        found = x;
        return x > 3;
      });`,
          },
          {
            // findIndex() with assignment in if block exploits early-exit (FP fix)
            code: `
      interface User { id: number; name: string }
      const users: User[] = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
      let matchedUser: User | undefined;
      users.findIndex(user => {
        if (user.name === 'Bob') {
          matchedUser = user;
          return true;
        }
        return false;
      });`,
          },
          {
            // find() with nested iteration and assignment: Jira ticket reproducer
            code: `
      interface Item { name: string; val: number }
      let found: Item | undefined;
      const haystack: { [key: string]: Item[] } = {
        a: [{ name: 'item1', val: 1 }],
        b: [{ name: 'item2', val: 2 }],
      };
      const needle = 'item2';
      Object.entries(haystack).find(([_key, arr]) => {
        found = arr.find(obj => obj.name === needle);
        return !!found;
      });`,
          },
          {
            // findLast() with assignment to outer variable (FP fix)
            code: `
      const nums: number[] = [1, 2, 3];
      let lastFound: number | undefined;
      nums.findLast(x => {
        lastFound = x;
        return x > 1;
      });`,
          },
          {
            // findLastIndex() with assignment to outer variable (FP fix)
            code: `
      const nums: number[] = [1, 2, 3];
      let lastIdx: number | undefined;
      nums.findLastIndex(x => {
        lastIdx = x;
        return x > 1;
      });`,
          },
          {
            // find() with assignment inside a for...of loop body (FP fix)
            code: `
      interface Item { match: boolean }
      interface Container { items: Item[] }
      let result: Item | undefined;
      const containers: Container[] = [];
      containers.find(x => {
        for (const item of x.items) {
          if (item.match) { result = item; return true; }
        }
        return false;
      });`,
          },
        ],
        invalid: [
          {
            code: `
      function methodsOnMath() {
        let x = -42;
        Math.abs(x);
      }`,
            errors: [
              {
                messageId: `returnValueMustBeUsed`,
                data: { methodName: 'abs' },
                line: 4,
                endLine: 4,
                column: 9,
                endColumn: 20,
              },
            ],
          },
          {
            code: `
      function mapOnArray() {
        let arr = [1, 2, 3];
        arr.map(function(x){ });
      }`,
            errors: [
              {
                messageId: `useForEach`,
              },
            ],
          },
          {
            code: `
      function methodsOnArray(arr1: any[]) {
        let arr = [1, 2, 3];

        arr.slice(0, 2);

        arr1.join(",");
      }`,
            errors: [
              {
                messageId: 'returnValueMustBeUsed',
                data: { methodName: 'slice' },
                line: 5,
                column: 9,
                endLine: 5,
                endColumn: 24,
              },
              {
                messageId: 'returnValueMustBeUsed',
                data: { methodName: 'join' },
                line: 7,
                column: 9,
                endLine: 7,
                endColumn: 23,
              },
            ],
          },
          {
            code: `
      function methodsOnString() {
        let x = "abc";
        x.concat("abc");
        "abc".concat("bcd");
        "abc".concat("bcd").charCodeAt(2);
        "abc".replace(/ab/, "d");
      }`,
            errors: [
              {
                messageId: 'returnValueMustBeUsed',
                data: { methodName: 'concat' },
                line: 4,
                column: 9,
                endLine: 4,
                endColumn: 24,
              },
              {
                messageId: 'returnValueMustBeUsed',
                data: { methodName: 'concat' },
                line: 5,
                column: 9,
                endLine: 5,
                endColumn: 28,
              },
              {
                messageId: 'returnValueMustBeUsed',
                data: { methodName: 'charCodeAt' },
                line: 6,
                column: 9,
                endLine: 6,
                endColumn: 42,
              },
              {
                messageId: 'returnValueMustBeUsed',
                data: { methodName: 'replace' },
                line: 7,
                column: 9,
                endLine: 7,
                endColumn: 33,
              },
            ],
          },
          {
            code: `
      function methodsOnNumbers() {
        var num = 43 * 53;
        num.toExponential();
      }`,
            errors: [
              {
                messageId: 'returnValueMustBeUsed',
                data: { methodName: 'toExponential' },
                line: 4,
                column: 9,
                endLine: 4,
                endColumn: 28,
              },
            ],
          },
          {
            code: `
      function methodsOnRegexp() {
        var regexp = /abc/;
        regexp.test("my string");
      }`,
            errors: [
              {
                messageId: 'returnValueMustBeUsed',
                data: { methodName: 'test' },
                line: 4,
                column: 9,
                endLine: 4,
                endColumn: 33,
              },
            ],
          },
          {
            // find() without assignment in callback still raises (pure callback)
            code: `
      const arr: number[] = [1, 2, 3];
      arr.find(x => x > 2);`,
            errors: [
              {
                messageId: 'returnValueMustBeUsed',
                data: { methodName: 'find' },
              },
            ],
          },
          {
            // findIndex() without assignment in callback still raises (pure callback)
            code: `
      const arr: number[] = [1, 2, 3];
      arr.findIndex(x => x > 2);`,
            errors: [
              {
                messageId: 'returnValueMustBeUsed',
                data: { methodName: 'findIndex' },
              },
            ],
          },
          {
            // findLast() without assignment raises as a new TP
            code: `
      const arr: number[] = [1, 2, 3];
      arr.findLast(x => x > 2);`,
            errors: [
              {
                messageId: 'returnValueMustBeUsed',
                data: { methodName: 'findLast' },
              },
            ],
          },
          {
            // findLastIndex() without assignment raises as a new TP
            code: `
      const arr: number[] = [1, 2, 3];
      arr.findLastIndex(x => x > 2);`,
            errors: [
              {
                messageId: 'returnValueMustBeUsed',
                data: { methodName: 'findLastIndex' },
              },
            ],
          },
        ],
      },
    );
  });
});
