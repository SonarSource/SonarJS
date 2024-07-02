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
import { rule } from './rule';
import { JavaScriptRuleTester } from '../../../tests/tools';

const ruleTester = new JavaScriptRuleTester();

function invalid(code: string) {
  const line = code.split('\n').findIndex(str => str.includes('// Noncompliant')) + 1;
  return {
    code,
    errors: [
      {
        messageId: 'removeRedundantJump',
        line,
        endLine: line,
      },
    ],
  };
}

ruleTester.run('Jump statements should not be redundant', rule, {
  invalid: [
    invalid(
      `while (x == 1) {
        console.log("x == 1");
        continue; // Noncompliant
      }`,
    ),
    invalid(
      `function redundantJump(condition1, condition2) {
        while (condition1) {
          if (condition2) {
            console.log("Hello");
            continue;  // Noncompliant
          } else {
            console.log("else");
          }
        }
      }`,
    ),
    invalid(
      `function redundantJump(condition1, condition2) {
        while (condition1) {
          if (condition2) {
            console.log("then");
          } else {
            console.log("else");
            continue;  // Noncompliant
          }
        }
      }`,
    ),
    invalid(
      `function redundantJump() {
        for (let i = 0; i < 10; i++) {
          console.log("Hello");
          continue; // Noncompliant
        }
      }`,
    ),
    invalid(
      `function redundantJump(b) {
        if (b) {
          console.log("b");
          return; // Noncompliant
        }
      }`,
    ),
    invalid(
      `function redundantJump(x) {
          console.log("x == 1");
          return; // Noncompliant
      }`,
    ),
    invalid(
      `const redundantJump = (x) => {
          console.log("x == 1");
          return; // Noncompliant
      }`,
    ),
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
