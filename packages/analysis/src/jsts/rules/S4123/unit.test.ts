/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import { rules } from '../external/typescript-eslint/index.js';
import {
  NoTypeCheckingRuleTester,
  RuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';
import path from 'node:path';

const jsFixture = path.join(import.meta.dirname, 'fixtures', 'placeholder.js');
const jsTypeAwareRuleTester = new RuleTester({
  parserOptions: {
    project: path.join(import.meta.dirname, 'fixtures', 'tsconfig.json'),
  },
});

const upstreamRule = rules['await-thenable'];

// Sentinel: verify that the upstream ESLint rule still raises on the patterns our decorator fixes.
// If this test starts failing (i.e., the upstream rule no longer reports these patterns),
// it signals that the decorator's async-modifier suppression can be safely removed.
describe('S4123 upstream sentinel', () => {
  it('upstream await-thenable raises on await of an async function with a non-Promise declared return type that decorator suppresses', () => {
    // JSDoc-adopted return type, JavaScript
    jsTypeAwareRuleTester.run('await-thenable', upstreamRule, {
      valid: [],
      invalid: [
        {
          filename: jsFixture,
          code: `
/**
 * @return {boolean} whether or not the package checksJs.
 */
async function packageNeedsExtraCheck(packagePath) {
  return true;
}
async function main(pkg) {
  return await packageNeedsExtraCheck(pkg);
}`,
          errors: 1,
        },
      ],
    });
    // Explicit non-Promise return annotation (TS1064), TypeScript
    new RuleTester().run('await-thenable', upstreamRule, {
      valid: [],
      invalid: [
        {
          code: `
async function isReady(): boolean {
  return true;
}
async function main() {
  return await isReady();
}`,
          errors: 1,
        },
      ],
    });
  });
});

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

    jsTypeAwareRuleTester.run(
      'await should only be used with promises: async modifier vs. non-Promise JSDoc return type',
      rule,
      {
        valid: [
          {
            filename: jsFixture,
            code: `
async function foo () {
  await bar() // Compliant: declared type is a Promise
}
/**
 * @return {Promise<number>}
 */
function bar () {
  return 5;
}`,
          },
          {
            filename: jsFixture,
            code: `
async function foo () {
  await bar() // Compliant: async guarantees a Promise
}
/**
 * @return {number}
 */
async function bar () {
  return Promise.resolve(5);
}`,
          },
          {
            filename: jsFixture,
            code: `
async function foo () {
  await bar.baz() // Compliant: declared type is a Promise
}

const bar = {
  /**
   * @return {Promise<number>}
   */
  baz() {
    return 5;
  }
}`,
          },
        ],
        invalid: [
          {
            filename: jsFixture,
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
            filename: jsFixture,
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

  it('suppresses await of a non-generator async function with a body', () => {
    jsTypeAwareRuleTester.run('await-thenable [js]', rule, {
      valid: [
        {
          // V1 - the ticket reproducer, kept verbatim
          filename: jsFixture,
          code: `
/**
 * @param {string} packagePath Path to the package.
 * @return {boolean} whether or not the package checksJs.
 */
async function packageNeedsExtraCheck(packagePath) {
  return true;
}
async function main(pkg) {
  return await packageNeedsExtraCheck(pkg); // Compliant: async guarantees a Promise
}`,
        },
        {
          // V2 - JSDoc-typed async arrow assigned to a const
          filename: jsFixture,
          code: `
/**
 * @returns {boolean}
 */
const isReady = async () => true;
async function main() {
  return await isReady(); // Compliant: async guarantees a Promise
}`,
        },
        {
          // V2b - same shape assigned with let
          filename: jsFixture,
          code: `
/**
 * @returns {boolean}
 */
let isReady2 = async () => true;
async function main() {
  return await isReady2(); // Compliant: async guarantees a Promise
}`,
        },
        {
          // V2c - class field arrow
          filename: jsFixture,
          code: `
class C {
  /**
   * @returns {boolean}
   */
  f = async () => true;
}
async function main() {
  return await new C().f(); // Compliant: async guarantees a Promise
}`,
        },
        {
          // V3 - object shorthand method
          filename: jsFixture,
          code: `
const o = {
  /**
   * @return {boolean}
   */
  async m() {
    return true;
  },
};
async function main() {
  return await o.m(); // Compliant: async guarantees a Promise
}`,
        },
        {
          // V3b - object property-assignment arrow
          filename: jsFixture,
          code: `
const o = {
  /**
   * @returns {boolean}
   */
  m: async () => true,
};
async function main() {
  return await o.m(); // Compliant: async guarantees a Promise
}`,
        },
        {
          // V4 - instance method and static method
          filename: jsFixture,
          code: `
class C {
  /**
   * @return {boolean}
   */
  async m() {
    return true;
  }
  /**
   * @return {boolean}
   */
  static async s() {
    return true;
  }
}
async function main() {
  await new C().m(); // Compliant: async guarantees a Promise
  await C.s(); // Compliant: async guarantees a Promise
}`,
        },
        {
          // V5 - this.m() and super.m()
          filename: jsFixture,
          code: `
class Base {
  /**
   * @return {boolean}
   */
  async m() {
    return true;
  }
  async self() {
    return await this.m(); // Compliant: async guarantees a Promise
  }
}
class Derived extends Base {
  async callSuper() {
    return await super.m(); // Compliant: async guarantees a Promise
  }
}`,
        },
        {
          // V6 - local alias indirection
          filename: jsFixture,
          code: `
/**
 * @return {boolean}
 */
async function pa(p) {
  return true;
}
async function main(p) {
  const alias = pa;
  return await alias(p); // Compliant: async guarantees a Promise
}`,
        },
        {
          // V7 - async fn declared in an outer function, awaited from a nested arrow
          filename: jsFixture,
          code: `
function outer() {
  /**
   * @return {boolean}
   */
  async function inner() {
    return true;
  }
  return async () => {
    return await inner(); // Compliant: async guarantees a Promise
  };
}`,
        },
        {
          // V8 - recursion
          filename: jsFixture,
          code: `
/**
 * @return {boolean}
 */
async function r(n) {
  return n ? await r(n - 1) : true; // Compliant: async guarantees a Promise
}`,
        },
        {
          // V9 - generic function
          filename: jsFixture,
          code: `
/**
 * @template T
 * @param {T} x
 * @return {T}
 */
async function g(x) {
  return x;
}
async function main() {
  return await g(1); // Compliant: async guarantees a Promise
}`,
        },
        {
          // V10 - arity mismatch (TS2554); the signature still resolves and the rule must not throw
          filename: jsFixture,
          code: `
/**
 * @return {boolean}
 */
async function pa(p) {
  return true;
}
async function main() {
  return await pa(1, 2, 3); // Compliant: async guarantees a Promise
}`,
        },
        {
          // V17 - optional call
          filename: jsFixture,
          code: `
/**
 * @return {boolean}
 */
async function pa(p) {
  return true;
}
async function main() {
  return await pa?.(); // Compliant: async guarantees a Promise
}`,
        },
        {
          // V18 - optional member call
          filename: jsFixture,
          code: `
const o = {
  /**
   * @return {boolean}
   */
  async m() {
    return true;
  },
};
async function main() {
  return await o.m?.(); // Compliant: async guarantees a Promise
}`,
        },
        {
          // V19 - optional chained receiver
          filename: jsFixture,
          code: `
const o = {
  /**
   * @return {boolean}
   */
  async m() {
    return true;
  },
};
async function main() {
  return await o?.m(); // Compliant: async guarantees a Promise
}`,
        },
      ],
      invalid: [],
    });

    new RuleTester().run('await-thenable [ts]', rule, {
      valid: [
        {
          // V14 - TS1064: explicit non-Promise return annotation, no JSDoc
          code: `
async function isReady(): boolean {
  return true;
}
async function main() {
  return await isReady(); // Compliant: async guarantees a Promise
}`,
        },
        {
          // V15 - TS1064 async arrow
          code: `
const isReady = async (): number => 1;
async function main() {
  return await isReady(); // Compliant: async guarantees a Promise
}`,
        },
        {
          // V16 - TS1064 async method
          code: `
class C {
  async m(): number {
    return 1;
  }
}
async function main() {
  return await new C().m(); // Compliant: async guarantees a Promise
}`,
        },
      ],
      invalid: [],
    });
  });

  it('keeps reporting where the async guarantee does not hold', () => {
    jsTypeAwareRuleTester.run('await-thenable [js]', rule, {
      valid: [],
      invalid: [
        {
          // I1 - non-async function documented @return {number} - the headline true positive
          filename: jsFixture,
          code: `
/**
 * @return {number}
 */
function bar() {
  return 5;
}
async function main() {
  return await bar(); // Noncompliant
}`,
          errors: 1,
        },
        {
          // I2 - the JSDoc @async tag is not a modifier and cannot fake it
          filename: jsFixture,
          code: `
/**
 * @async
 * @return {number}
 */
function fakeAsync() {
  return 5;
}
async function main() {
  return await fakeAsync(); // Noncompliant
}`,
          errors: 1,
        },
        {
          // I3 - async generator function: evaluates to an AsyncGenerator, not a Promise
          filename: jsFixture,
          code: `
/**
 * @return {boolean}
 */
async function* g() {
  yield true;
}
async function main() {
  return await g(); // Noncompliant
}`,
          errors: [
            {
              messageId: 'await',
              line: 9,
              suggestions: [
                {
                  messageId: 'removeAwait',
                  output: `
/**
 * @return {boolean}
 */
async function* g() {
  yield true;
}
async function main() {
  return  g(); // Noncompliant
}`,
                },
              ],
            },
          ],
        },
        {
          // I4 - async generator object method
          filename: jsFixture,
          code: `
const o = {
  /**
   * @return {boolean}
   */
  async *m() {
    yield true;
  },
};
async function main() {
  return await o.m(); // Noncompliant
}`,
          errors: [
            {
              messageId: 'await',
              line: 11,
              suggestions: [
                {
                  messageId: 'removeAwait',
                  output: `
const o = {
  /**
   * @return {boolean}
   */
  async *m() {
    yield true;
  },
};
async function main() {
  return  o.m(); // Noncompliant
}`,
                },
              ],
            },
          ],
        },
        {
          // I5 - async generator class method
          filename: jsFixture,
          code: `
class G {
  /**
   * @return {boolean}
   */
  async *m() {
    yield true;
  }
}
async function main() {
  return await new G().m(); // Noncompliant
}`,
          errors: [
            {
              messageId: 'await',
              line: 11,
              suggestions: [
                {
                  messageId: 'removeAwait',
                  output: `
class G {
  /**
   * @return {boolean}
   */
  async *m() {
    yield true;
  }
}
async function main() {
  return  new G().m(); // Noncompliant
}`,
                },
              ],
            },
          ],
        },
        {
          // I9 - callee declaration is a FunctionType (signature-only)
          filename: jsFixture,
          code: `
/**
 * @param {() => number} cb
 */
async function f(cb) {
  return await cb(); // Noncompliant
}`,
          errors: 1,
        },
        {
          // I10 - callee declaration is a MethodSignature from a JSDoc @typedef
          filename: jsFixture,
          code: `
/**
 * @typedef {{ m(): number }} Iface
 */
/**
 * @type {Iface}
 */
const o = { m: () => 5 };
async function main() {
  return await o.m(); // Noncompliant
}`,
          errors: 1,
        },
        {
          // I11 - for-await-of a non-async iterable; different messageId, unrelated to the guard
          filename: jsFixture,
          code: `
async function f() {
  for await (const x of [1, 2]) { // Noncompliant
    console.log(x);
  }
}`,
          errors: 1,
        },
        {
          // I13 - Promise.all aggregator input; same FP family, out of scope for this ticket
          filename: jsFixture,
          code: `
/**
 * @return {boolean}
 */
async function a() {
  return true;
}
Promise.all([a()]); // Noncompliant
// FP kept on purpose: promise-aggregator input is out of scope for this ticket, see decorator JSDoc
`,
          errors: 1,
        },
        {
          // I14 - await of a plain, non-call value inside an async function
          filename: jsFixture,
          code: `
async function f() {
  const x = 1;
  await x; // Noncompliant
}`,
          errors: 1,
        },
      ],
    });

    new RuleTester().run('await-thenable [ts]', rule, {
      valid: [],
      invalid: [
        {
          // I6 - abstract async declaration has no body: no implementation to reason about
          code: `
abstract class Base {
  abstract async load(): number;
}
async function main(b: Base) {
  return await b.load(); // Noncompliant
}`,
          errors: 1,
        },
        {
          // I7 - ambient class method has no body
          code: `
declare class A {
  async m(): number;
}
async function main(a: A) {
  return await a.m(); // Noncompliant
}`,
          errors: 1,
        },
        {
          // I8 - async generator in TypeScript: the more dangerous half, a plain un-JSDoc'd true positive
          code: `
async function* g() {
  yield true;
}
async function main() {
  return await g(); // Noncompliant
}`,
          errors: [
            {
              messageId: 'await',
              line: 6,
              suggestions: [
                {
                  messageId: 'removeAwait',
                  output: `
async function* g() {
  yield true;
}
async function main() {
  return  g(); // Noncompliant
}`,
                },
              ],
            },
          ],
        },
        {
          // I12 - await using of a non-AsyncDisposable; different messageId, callee is still async
          code: `
async function mk(): boolean {
  return true;
}
async function f() {
  await using r = mk(); // Noncompliant
}`,
          errors: 1,
        },
      ],
    });
  });
});
