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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S3626', () => {
  it('S3626', () => {
    const ruleTester = new RuleTester();

    ruleTester.run('Jump statements should not be redundant', rule, {
      invalid: [
        {
          code: `while (x == 1) {
        console.log("x == 1");
        continue; // Noncompliant
      }`,
          errors: [
            {
              messageId: 'removeRedundantJump',
              line: 3,
              endLine: 3,
              suggestions: [
                {
                  messageId: 'suggestJumpRemoval',
                  output: `while (x == 1) {
        console.log("x == 1"); // Noncompliant
      }`,
                },
              ],
            },
          ],
        },
        {
          code: `function redundantJump(condition1, condition2) {
        while (condition1) {
          if (condition2) {
            console.log("Hello");
            continue;  // Noncompliant
          } else {
            console.log("else");
          }
        }
      }`,
          errors: [
            {
              messageId: 'removeRedundantJump',
              line: 5,
              endLine: 5,
              suggestions: [
                {
                  messageId: 'suggestJumpRemoval',
                  output: `function redundantJump(condition1, condition2) {
        while (condition1) {
          if (condition2) {
            console.log("Hello");  // Noncompliant
          } else {
            console.log("else");
          }
        }
      }`,
                },
              ],
            },
          ],
        },
        {
          code: `function redundantJump(condition1, condition2) {
        while (condition1) {
          if (condition2) {
            console.log("then");
          } else {
            console.log("else");
            continue;  // Noncompliant
          }
        }
      }`,
          errors: [
            {
              messageId: 'removeRedundantJump',
              line: 7,
              endLine: 7,
              suggestions: [
                {
                  messageId: 'suggestJumpRemoval',
                  output: `function redundantJump(condition1, condition2) {
        while (condition1) {
          if (condition2) {
            console.log("then");
          } else {
            console.log("else");  // Noncompliant
          }
        }
      }`,
                },
              ],
            },
          ],
        },
        {
          code: `function redundantJump() {
        for (let i = 0; i < 10; i++) {
          console.log("Hello");
          continue; // Noncompliant
        }
      }`,
          errors: [
            {
              messageId: 'removeRedundantJump',
              line: 4,
              endLine: 4,
              suggestions: [
                {
                  messageId: 'suggestJumpRemoval',
                  output: `function redundantJump() {
        for (let i = 0; i < 10; i++) {
          console.log("Hello"); // Noncompliant
        }
      }`,
                },
              ],
            },
          ],
        },
        {
          code: `function redundantJump(b) {
        if (b) {
          console.log("b");
          return; // Noncompliant
        }
      }`,
          errors: [
            {
              messageId: 'removeRedundantJump',
              line: 4,
              endLine: 4,
              suggestions: [
                {
                  messageId: 'suggestJumpRemoval',
                  output: `function redundantJump(b) {
        if (b) {
          console.log("b"); // Noncompliant
        }
      }`,
                },
              ],
            },
          ],
        },
        {
          code: `function redundantJump(x) {
          console.log("x == 1");
          return; // Noncompliant
      }`,
          errors: [
            {
              messageId: 'removeRedundantJump',
              line: 3,
              endLine: 3,
              suggestions: [
                {
                  messageId: 'suggestJumpRemoval',
                  output: `function redundantJump(x) {
          console.log("x == 1"); // Noncompliant
      }`,
                },
              ],
            },
          ],
        },
        {
          code: `const redundantJump = (x) => {
          console.log("x == 1");
          return; // Noncompliant
      }`,
          errors: [
            {
              messageId: 'removeRedundantJump',
              line: 3,
              endLine: 3,
              suggestions: [
                {
                  messageId: 'suggestJumpRemoval',
                  output: `const redundantJump = (x) => {
          console.log("x == 1"); // Noncompliant
      }`,
                },
              ],
            },
          ],
        },
        {
          code: `function foo(x) { console.log(x); return; }`,
          errors: [
            {
              messageId: 'removeRedundantJump',
              suggestions: [
                { messageId: 'suggestJumpRemoval', output: `function foo(x) { console.log(x); }` },
              ],
            },
          ],
        },
        {
          code: `
function foo(x) { 
  console.log(x);
  // comment1
  // comment2
  return;
}`,
          errors: [
            {
              messageId: 'removeRedundantJump',
              suggestions: [
                {
                  messageId: 'suggestJumpRemoval',
                  output: `
function foo(x) { 
  console.log(x);
  // comment1
  // comment2
}`,
                },
              ],
            },
          ],
        },
      ],
      valid: [
        {
          code: `
      function return_with_value() {
        foo();
        return 42;
      }

      function switch_statements(x) {
        switch (x) {
          case 0:
            foo();
            break;
          default:
        }
        foo();
        switch (x) {
          case 0:
            foo();
            return;
          case 1:
            bar();
            return;
        }
      }

      function loops_with_label() {
        for (let i = 0; i < 10; i++) {
          inner: for (let j = 0; j < 10; j++) {
            continue inner;
          }
        }
      }

      function compliant(b) {
        for (let i = 0; i < 10; i++) {
          break;
        }
        if (b) {
          console.log("b");
          return;
        }
        console.log("useful");
      }

      while (x == 1) {
        continue; // Ok, we ignore when 1 statement
      }

      function bar() {
        return; // Ok, we ignore when 1 statement
      }
      `,
        },
      ],
    });
  });
});
