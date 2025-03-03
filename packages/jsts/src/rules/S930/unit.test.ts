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
import { rule } from './rule.js';
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { IssueLocation } from '../helpers/index.js';
import { describe, it } from 'node:test';

const ruleTester = new DefaultParserRuleTester({ sourceType: 'script' });

describe('S930', () => {
  it('S930', () => {
    ruleTester.run('no-extra-arguments', rule, {
      valid: [
        {
          code: `
        function foo(p1, p2) {}
        foo(1, 2);
        foo(1);
      `,
        },
        {
          code: `
        function foo() {
          console.log(arguments);
        }
        foo(1, 2);
      `,
        },
        {
          code: `
        function foo(p1, ...p2) {}
        foo(1, 2, 3, 4);
      `,
        },
        {
          code: `
        let foo = function(...p1) {}
        foo(1, 2, 3, 4);
      `,
        },
        {
          code: `
        let noop = () => {};
        function foo(callback = noop) {
          callback(42);
        }
      `,
        },
        {
          code: `
        let x = () => {};
        if (cond) {
          x = (p1, p2) => 1;
        }
        x(1, 2);
      `,
        },
      ],
      invalid: [
        {
          code: `
        function foo(p1, p2) {}
        foo(1, 2, 3);
        foo(1, 2, 3, 4);
      `,
          errors: [
            message(2, 3, { line: 3, column: 9, endColumn: 12 }),
            message(2, 4, { line: 4, column: 9, endColumn: 12 }),
          ],
        },
        {
          code: `
        function foo(p1, p2) {}
        //           ^^^^^^>
        foo(1, 2, 3);
      //^^^      <^
      `,
          errors: [
            {
              messageId: 'sonarRuntime',
              data: {
                expectedArguments: '2 arguments',
                providedArguments: '3 were',
                sonarRuntimeData: encodedMessage(2, 3, [
                  { message: 'Formal parameters', column: 21, line: 2, endColumn: 27, endLine: 2 },
                  { message: 'Extra argument', column: 18, line: 4, endColumn: 19, endLine: 4 },
                ]),
              },
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `
        var foo = function() {
          console.log('hello');
        }
        foo(1);
      `,
          errors: [message(0, 1, { line: 5, column: 9, endColumn: 12 })],
        },
        {
          code: `
        foo(1);
      //    ^
        var foo = function() {
          //      ^^^^^^^^>
          console.log('hello');
        }
      `,
          errors: [
            {
              messageId: 'sonarRuntime',
              data: {
                expectedArguments: 'no arguments',
                providedArguments: '1 was',
                sonarRuntimeData: encodedMessage(0, 1, [
                  { message: 'Formal parameters', column: 18, line: 4, endColumn: 26, endLine: 4 },
                  { message: 'Extra argument', column: 12, line: 2, endColumn: 13, endLine: 2 },
                ]),
              },
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `
        (function(p1, p2){
          doSomething1;
          doSomething2;
        })(1, 2, 3);
      `,
          errors: [message(2, 3, { line: 2, column: 10, endLine: 5, endColumn: 10 })],
        },
        {
          code: `
        let x = function(a, b) {
          return a + b;
        }(1, 2, 3);
      `,
          errors: [message(2, 3, { line: 2, column: 17, endLine: 4, endColumn: 10 })],
        },
        {
          code: `
        ((a, b) => {
          return a + b;
        })(1, 2, 3);
      `,
          errors: [message(2, 3, { line: 2, column: 10, endLine: 4, endColumn: 10 })],
        },
        {
          code: `
        let arrow_function = (a, b) => {};
        arrow_function(1, 2, 3);
      `,
          errors: [message(2, 3, { line: 3, column: 9, endColumn: 23 })],
        },
        {
          code: `
        function foo(arguments) {
          console.log(arguments);
        }
        foo(1, 2);
      `,
          errors: [message(1, 2, { line: 5, column: 9, endColumn: 12 })],
        },
        {
          code: `
        function foo() {
          let arguments = [3, 4];
          console.log(arguments);
        }
        foo(1, 2);
      `,
          errors: [message(0, 2, { line: 6, column: 9, endColumn: 12 })],
        },
      ],
    });
  });

  function message(expected: number, provided: number, extra = {}) {
    // prettier-ignore
    const expectedArguments =
    expected === 0 ? "no arguments" :
    expected === 1 ? "1 argument" :
    `${expected} arguments`;

    // prettier-ignore
    const providedArguments =
    provided === 0 ? "none was" :
    provided === 1 ? "1 was" :
    `${provided} were`;

    return {
      messageId: 'tooManyArguments',
      data: {
        expectedArguments,
        providedArguments,
      },
      ...extra,
    };
  }

  function encodedMessage(expected: number, provided: number, secondaryLocations: IssueLocation[]) {
    const testCaseError = message(expected, provided);

    return JSON.stringify({
      message: `This function expects ${testCaseError.data?.expectedArguments}, but ${testCaseError.data?.providedArguments} provided.`,
      secondaryLocations,
    });
  }
});
