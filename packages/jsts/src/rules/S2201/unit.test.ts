/*
 * eslint-plugin-sonarjs
 * Copyright (C) 2018-2021 SonarSource SA
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
import { rule } from './rule';
import { TypeScriptRuleTester } from '../../../tests/tools';

const ruleTester = new TypeScriptRuleTester();

ruleTester.run('Return values from functions without side effects should not be ignored', rule, {
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
  ],
});
