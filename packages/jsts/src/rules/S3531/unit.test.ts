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
import { TypeScriptRuleTester } from '../../../tests/tools/index.js';
import { rule } from './index.js';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
const ruleTesterTs = new TypeScriptRuleTester();

const testCases = {
  valid: [
    {
      code: `
            var foo = function * () {
            }
            `,
    },
    {
      code: `
            var foo = function * () {
              let a = 3;
              yield a;
            }
            `,
    },
    {
      code: `
            function someFunction() {
              doSomething();
            }
            `,
    },
  ],
  invalid: [
    {
      code: `
            function * foo() {
            //         ^^^
              return 1;
            }
            `,
      errors: [
        {
          message: `Add a "yield" statement to this generator.`,
          line: 2,
          endLine: 2,
          column: 24,
          endColumn: 27,
        },
      ],
    },
    {
      code: `
            var foo = function * () {
            //        ^^^^^^^^
              doSomething();
            }
            `,
      errors: [
        {
          message: `Add a "yield" statement to this generator.`,
          line: 2,
          endLine: 2,
          column: 23,
          endColumn: 31,
        },
      ],
    },
    {
      code: `
            var foo = function * bar () {
              doSomething();
            }
            `,
      errors: 1,
    },
    {
      code: `
            function * foo() {  // Noncompliant
            //         ^^^
              function * bar() {  // OK
                yield 1;
              }
            }
            `,
      errors: [
        {
          message: `Add a "yield" statement to this generator.`,
          line: 2,
          endLine: 2,
          column: 24,
          endColumn: 27,
        },
      ],
    },
    {
      code: `
            class A {
              *foo() {
                doSomething();
              }
            }
            `,
      errors: [
        {
          message: `Add a "yield" statement to this generator.`,
          line: 3,
          endLine: 3,
          column: 16,
          endColumn: 19,
        },
      ],
    },
  ],
};

ruleTester.run('Generator without yield', rule, testCases);

ruleTesterTs.run('Generator without yield TypeScript', rule, testCases);
