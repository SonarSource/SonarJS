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
import { rule } from './rule.js';
import { expandMessage, IssueLocation } from '../helpers/index.js';
import Module from 'node:module';
const require = Module.createRequire(import.meta.url);

const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: 'module', ecmaFeatures: { jsx: true } },
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('no-identical-functions', rule, {
  valid: [
    {
      // different body
      code: `
      function foo() {
        console.log("Hello");
        console.log("World");
        return 42;
      }

      function bar() {
        if (x) {
          console.log("Hello");
        }
        return 42;
      }`,
    },
    {
      // few lines
      code: `
      function foo() {
        console.log("Hello");
        return 42;
      }

      function bar() {
        console.log("Hello");
        return 42;
      }`,
    },
    {
      code: `
      let foo = (a, b) => {
        [
          a,
          b
        ]
      }

      let bar = (a, b) => (
        [
          a,
          b
        ]
      )
      `,
    },
    {
      code: `
      class Foo {
        foo() {
          console.log("Hello");
          console.log("World");
          return 42;
        }
        bar() {
          console.log("Hello");
          console.log("World");
          return 42;
        }
      }`,
      options: [4],
    },
  ],
  invalid: [
    {
      // basic case
      code: `
      function foo() {
        console.log("Hello");
        console.log("World");
        return 42;
      }

      function bar() {
        console.log("Hello");
        console.log("World");
        return 42;
      }`,
      errors: [message(2, 8)],
    },
    {
      // different kinds of functions
      code: `
      function foo() {
        console.log("Hello");
        console.log("World");
        return 42;
      }

      let funcExpression = function () { // Noncompliant
        console.log("Hello");
        console.log("World");
        return 42;
      }

      let arrowFunction = () => { // Noncompliant
        console.log("Hello");
        console.log("World");
        return 42;
      }

      class A {
        constructor() { // Noncompliant
          console.log("Hello");
          console.log("World");
          return 42;
        }

        method() { // Noncompliant
          console.log("Hello");
          console.log("World");
          return 42;
        }

        set setter(p) { // Noncompliant
          console.log("Hello");
          console.log("World");
          return 42;
        }

        get getter() { // Noncompliant
          console.log("Hello");
          console.log("World");
          return 42;
        }
      }

      async function asyncFunction() { // Noncompliant
        console.log("Hello");
        console.log("World");
        return 42;
      }

      let asyncExpression = async function () { // Noncompliant
        console.log("Hello");
        console.log("World");
        return 42;
      }`,
      errors: [
        // prettier-ignore
        message(2, 8),
        message(2, 14),
        {
          message:
            'Update this function so that its implementation is not identical to the one on line 2.',
          line: 21,
          column: 9,
          endColumn: 20,
        }, // constructor
        {
          message:
            'Update this function so that its implementation is not identical to the one on line 2.',
          line: 27,
          column: 9,
          endColumn: 15,
        }, // method
        {
          message:
            'Update this function so that its implementation is not identical to the one on line 2.',
          line: 33,
          column: 13,
          endColumn: 19,
        }, // setter
        {
          message:
            'Update this function so that its implementation is not identical to the one on line 2.',
          line: 39,
          column: 13,
          endColumn: 19,
        }, // getter
        {
          message:
            'Update this function so that its implementation is not identical to the one on line 2.',
          line: 46,
          column: 22,
          endColumn: 35,
        }, // async declaration
        {
          message:
            'Update this function so that its implementation is not identical to the one on line 2.',
          line: 52,
          column: 35,
          endColumn: 43,
        }, // async expression
      ],
    },
    {
      code: `
        function foo(a, b) {
          a += b; b -= a; return {
            b
          };
        }
        function bar(a, b) {
          a += b; b -= a; return {
            b
          };
        }
      `,
      options: [3, 'sonar-runtime'],
      errors: [
        encodedMessage(2, 7, [
          { message: 'Original implementation', column: 17, line: 2, endColumn: 20, endLine: 2 },
        ]),
      ],
    },
    {
      code: `
        function foo(a) {
          try {
            return a;
          } catch {
            return 2 * a;
          }
        }
        function bar(a) {
          try {
            return a;
          } catch {
            return 2 * a;
          }
        }
      `,
      options: [3, 'sonar-runtime'],
      errors: [
        encodedMessage(2, 9, [
          { message: 'Original implementation', column: 17, line: 2, endColumn: 20, endLine: 2 },
        ]),
      ],
    },
    {
      code: `
        class Foo {
          foo() {
            console.log("Hello");
            console.log("World");
            return 42;
          }
          bar() {
            console.log("Hello");
            console.log("World");
            return 42;
          }
        }
      `,
      errors: [message(3, 8)],
    },
    {
      code: `
        const foo = () => {
          console.log("Hello");
          console.log("World");
          return 42;
        };
        const bar = () => {
          console.log("Hello");
          console.log("World");
          return 42;
        };
      `,
      errors: [message(2, 7)],
    },
  ],
});

function message(originalLine: number, duplicationLine: number): RuleTester.TestCaseError {
  return {
    message: expandMessage(
      'Update this function so that its implementation is not identical to the one on line {{line}}.',
      {
        line: originalLine,
      },
    ),
    line: duplicationLine,
    endLine: duplicationLine,
  };
}

function encodedMessage(
  originalLine: number,
  duplicationLine: number,
  secondaries: IssueLocation[],
): RuleTester.TestCaseError {
  return {
    messageId: 'sonarRuntime',
    data: {
      line: originalLine,
      sonarRuntimeData: JSON.stringify({
        message: `Update this function so that its implementation is not identical to the one on line ${originalLine}.`,
        secondaryLocations: secondaries,
      }),
    },
    line: duplicationLine,
    endLine: duplicationLine,
  };
}
