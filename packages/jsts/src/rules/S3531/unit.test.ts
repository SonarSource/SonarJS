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
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S3531', () => {
  it('S3531', () => {
    const ruleTester = new DefaultParserRuleTester();
    const ruleTesterTs = new DefaultParserRuleTester();

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
  });
});
