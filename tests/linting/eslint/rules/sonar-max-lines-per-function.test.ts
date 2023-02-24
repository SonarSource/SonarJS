/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { rule } from 'linting/eslint/rules/sonar-max-lines-per-function';

const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2018, ecmaFeatures: { jsx: true } },
});

ruleTester.run('Too many lines in functions', rule, {
  valid: [
    {
      code: `function f() {
              console.log("a");
            }`,
      options: [3],
    },
    {
      code: `function f() {
        
              console.log("a");


            }`,
      options: [3],
    },
    {
      code: `function f() {
              // comment
              console.log("a");
              /*
                multi
                line
                comment
              */
            }`,
      options: [3],
    },
    {
      code: `function foo() {
              console.log("a"); // End of line comment
            }`,
      options: [3],
    },
    {
      code: `
            console.log("a");
            function foo() {
              console.log("a");
            }
            console.log("a");
            `,
      options: [3],
    },
    {
      code: `function f() {
              function g() {
                console.log("a");
              }
            }`,
      options: [5],
    },
    {
      code: `(
function
()
{
}
)
()`, //IIFE are ignored
      options: [6],
    },
    {
      // React Function Component
      code: `
      function Welcome() {
        const greeting = 'Hello, world!';

        return <h1>{greeting}</h1>
      }`,
      options: [2],
    },
    {
      // React Function Component using function expressions and JSXFragments
      code: `
      let a = function Welcome() {
        const greeting = 'Hello, world!';

        return <><h1>{greeting}</h1></>
      }`,
      options: [2],
    },
  ],
  invalid: [
    {
      code: `function foo() {
            console.log("a");
            console.log("a");
          }`,
      options: [3],
      errors: [
        {
          message: `This function has 4 lines, which is greater than the 3 lines authorized. Split it into smaller functions.`,
          line: 1,
          endLine: 1,
          column: 10,
          endColumn: 13,
        },
      ],
    },
    {
      code: `function foo() {
            console.log("a");
            console.log("a");
            console.log("b");
          }`,
      options: [4],
      errors: [
        {
          message: `This function has 5 lines, which is greater than the 4 lines authorized. Split it into smaller functions.`,
          line: 1,
          endLine: 1,
          column: 10,
          endColumn: 13,
        },
      ],
    },
    {
      // React Function Component
      code: `
      function Welcome() {
        const greeting = 'Hello, world!';

        const doSomething = () => {
          console.log('foo');
          console.log('bar');
          console.log('baz');
        }

        return <h1>{greeting}</h1>
      }`,
      options: [2],
      errors: [
        {
          line: 5,
        },
      ],
    },
  ],
});
