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
import { rule } from './index.js';
import { DefaultParserRuleTester, RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S4123', () => {
  it('S4123', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('await should only be used with promises.', rule, {
      valid: [
        {
          code: `
      async function foo() {
        await ({then() { }});
      }
      `,
        },
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
      class MyPromiseLike implements PromiseLike<any> {
        then(){}
      }
      async function foo() {
        await new MyPromiseLike();
      }
      `,
        },
        {
          code: `
      class MyPromiseLike implements PromiseLike<any> {
        then(){}
      }
      class MyPromiseLike2 extends MyPromiseLike {
        then(){}
      }
      async function foo() {
        await new MyPromiseLike2();
      }
      `,
        },
        {
          code: `
      class MyPromise implements Promise<any> {
        then(){}
      }
      async function foo() {
        await new MyPromise();
      }
      `,
        },
        {
          code: `
      interface Thenable<T> {
        then: () => T
      }
      class MyThenable implements Thenable<number> {
        then() {
          return 1;
        }
      }
      async function foo() {
        await new MyThenable();
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
      class Foo {
        then: Promise<Bar>;
      }
      function qux(): Foo {}
      const baz = await qux();`,
        },
        {
          code: `
      async function foo() {
        await bar();
      }
      `,
        },
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
        {
          code: `function returnBoolOrPromise(x: boolean) {
  if (x) {
    return x;
  } else { 
    return Promise.resolve(10);
  }
}

async function bar() { 
  await returnBoolOrPromise();
}`,
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
              message: "Refactor this redundant 'await' on a non-promise.",
              line: 4,
              endLine: 4,
              column: 9,
              endColumn: 18,
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
        {
          code: `function returnBool() { 
  return false;
}

async function bar() { 
  await returnBool();
}`,
          errors: 1,
        },
        {
          code: `function returnNumberOrString(isNumber: boolean) {
  if (isNumber) {
    return 10;
  } else {
    return "stringValue";
  }
}

async function bar() {
  await returnNumberOrString(true);
}`,
          errors: 1,
        },
      ],
    });

    const ruleTesterWithNoFullTypeInfo = new DefaultParserRuleTester();

    ruleTesterWithNoFullTypeInfo.run('await should only be used with promises.', rule, {
      valid: [
        {
          code: `
      function bar() { return 42; }
      async function foo() {
        await bar();
      }
      `,
        },
      ],
      invalid: [],
    });
  });
});
