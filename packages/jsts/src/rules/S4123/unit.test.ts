/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { rule } from './index.js';
import { NoTypeCheckingRuleTester, RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S4123', () => {
  it('S4123', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('await should only be used with promises.', rule, {
      valid: [
        {
          code: `
      async function foo() {
        await Promise.resolve(42);
      }
      `,
        },
        {
          code: `
      async function foo(p: PromiseLike<any>) {
        await p;
      }
      `,
        },
        {
          code: `
      import { NotExisting } from "invalid";
      async function foo() {
        await new NotExisting();
      }
      `,
        },
        {
          code: `
      function returnNumber(): number | Promise<number> {
        return 1
      }
      async function foo() {
        await returnNumber();
      }
      `,
        },
        {
          code: `
      interface MyQuery<T> extends Pick<Promise<T>, keyof Promise<T>> {
        toQuery(): string;
      }
      async function foo(query: MyQuery<string>) {
        const result = await query;
        console.log(result);
      }
      `,
        },
        {
          code: `
      async function foo(x: unknown) {
        await x;
      }
      `,
        },
        {
          code: `
      export class NoErrorThrownError extends Error {};
      export class TestUtils {
          public static getError = async (
              call: () => PromiseLike<unknown> | unknown
          ): Promise<TError> => {
              try {
                  await call();
                  throw new NoErrorThrownError();
              } catch (error) {
                  return error as TError;
              }
          };
      }
      `,
        },
        {
          code: `
      async function foo() {
        await bar();
      }
      `,
        },
      ],
      invalid: [
        {
          code: `
      async function foo() {
        let arr = [1, 2, 3];
        await arr;
      }
      `,
          errors: [
            {
              message: 'Unexpected `await` of a non-Promise (non-"Thenable") value.',
              line: 4,
              endLine: 4,
              column: 9,
              endColumn: 18,
              suggestions: [
                {
                  output: `
      async function foo() {
        let arr = [1, 2, 3];
         arr;
      }
      `,
                  desc: 'Remove unnecessary `await`.',
                },
              ],
            },
          ],
        },
        {
          code: `
      async function foo() {
        let x: number = 1;
        await x;
      }
      `,
          errors: 1,
        },
        {
          code: `
      async function foo() {
        await 1;
      }
      `,
          errors: 1,
        },
        {
          code: `
      async function foo() {
        await {else: 42};
      }
      `,
          errors: 1,
        },
        {
          code: `
      async function foo() {
        await {then: 42};
      }
      `,
          errors: 1,
        },
      ],
    });

    const ruleTesterWithNoFullTypeInfo = new NoTypeCheckingRuleTester();

    ruleTesterWithNoFullTypeInfo.run('await should only be used with promises.', rule, {
      valid: [
        {
          code: `
      async function bar() { return 42; }
      async function foo() {
        await bar();
      }
      `,
        },
      ],
      invalid: [],
    });

    const javaScriptRuleTester = new RuleTester();
    javaScriptRuleTester.run(
      'await should only be used with promises: ignore function calls for functions with JSdoc',
      rule,
      {
        valid: [
          {
            code: `
async function foo () {
  await bar() // Compliant: ignored because of JSDoc
}
/**
 * @return {Promise<number>}
 */
async function bar () {
  return 5;
}`,
          },
          {
            code: `
async function foo () {
  await bar() // Compliant: ignored because of JSDoc
}
/**
 * @return {number}
 */
async function bar () {
  return Promise.resolve(5);
}`,
          },
          {
            code: `
async function foo () {
  await bar.baz() // Compliant: ignored because of JSDoc
}

const bar = {
  /**
   * @return {Promise<number>}
   */
  baz() {
    return Promise.resolve(5);
  }
}`,
          },
        ],
        invalid: [
          {
            code: `
async function foo () {
    await bar() // Noncompliant
}
function bar () {
    return 5;
}`,
            errors: 1,
          },
          {
            code: `
async function foo () {
    await bar() // Noncompliant
}
/**
 * JSdoc without return type
 */
function bar () {
    return 5;
}`,
            errors: 1,
          },
        ],
      },
    );
  });
});
