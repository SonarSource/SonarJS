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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S4822', () => {
  it('S4822', () => {
    const ruleTester = new RuleTester();
    ruleTester.run(`Promise rejections should not be caught by 'try' block`, rule, {
      valid: [
        {
          code: `
      function returningPromise() { return Promise.reject(); }
      async function okWithAwait() {
        try {
          await returningPromise();
        } catch (e) {
          console.log(e);
        }
      }
      `,
        },
        {
          code: `
      function returningPromise() { return Promise.reject(); }
      function okWithAnotherCall() {
        try {
          someFunc(); // can throw potentionally
          returningPromise();
        } catch (e) {
          console.log(e);
        }
      }
      `,
        },
        {
          code: `
      function returningPromise() { return Promise.reject(); }
      function okWithoutCatch() {
        try {
          returningPromise();
        } finally {
          console.log("finally");
        }
      }
      `,
        },
        {
          code: `
      function returningPromise() { return Promise.reject(); }
      function okWithNestedFunc() {
        try {
          let func = () => returningPromise();
        } catch (e) {
          console.log(e);
        }
      }
      `,
        },
        {
          code: `
      function returningPromise() { return Promise.reject(); }
      async function okWithAwaitAndPromise() {
        try {
          await returningPromise(); // this can throw
          returningPromise();
        } catch (e) {
          console.log(e);
        }
      }
      `,
        },
        {
          code: `
      function returningPromise() { return Promise.reject(); }
      async function * okWithYield() {
        try {
          yield returningPromise();
        } catch (e) {
          console.log(e);
        }
      }
      `,
        },
      ],
      invalid: [
        {
          code: `
      function returningPromise() { return Promise.reject(); }
      function singlePromise() {
        try {
          returningPromise();
        } catch (e) {
          console.log(e);
        }
      }
      `,
          errors: [
            {
              message: `{"message":"Consider using 'await' for the promise inside this 'try' or replace it with 'Promise.prototype.catch(...)' usage.","secondaryLocations":[{"message":"Promise","column":10,"line":5,"endColumn":28,"endLine":5}]}`,
              line: 4,
              endLine: 4,
              column: 9,
              endColumn: 12,
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `
      function returningPromise() { return Promise.reject(); }
      function uselessTry() {
        try {
          returningPromise().catch();
        } catch (e) {
          console.log(e);
        }
      }
      `,
          errors: [
            {
              message: `{"message":"Consider removing this 'try' statement as promise rejection is already captured by '.catch()' method.","secondaryLocations":[{"message":"Caught promise","column":10,"line":5,"endColumn":28,"endLine":5}]}`,
              line: 4,
              endLine: 4,
              column: 9,
              endColumn: 12,
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `
      function returningPromise() { return Promise.reject(); }
      function conditionalPromise(cond: boolean) {
        try {
          if (cond) {
            returningPromise();
          } else {
            let x = 42;
            returningPromise();
          }
        } catch (e) {
          console.log(e);
        }
      }
      `,
          errors: 1,
        },
        {
          code: `
      function returningPromise() { return Promise.reject(); }
      async function severalTry() {
        try {
          await returningPromise();
        } catch (e) {
          console.log(e);
        }

        try {
          returningPromise();
        } catch (e) {
          console.log(e);
        }
      }
      `,
          errors: 1,
        },
        {
          code: `
      function returningPromise() { return Promise.reject(); }
      function newPromise() {
        try {
          new Promise((res, rej) => {});
        } catch (e) {
          console.log(e);
        }
      }
      `,
          errors: 1,
        },
        {
          code: `
      function returningPromiseAndThrowing(cond: boolean) {
        if (cond) {
          return new Promise((res, rej) => {});
        } else {
          throw "error";
        }
      }

      // can be considered as False Positive as 'returningPromiseAndThrowing' can throw
      function testFunctionReturningPromiseAndThrowing(cond: boolean) {
        try {
          returningPromiseAndThrowing(cond);
        } catch (e) {
          console.log(e);
        }
      }
      `,
          errors: 1,
        },
        {
          code: `
      function returningPromise() { return Promise.reject(); }
      function uselessTryThenCatch() {
        try {
          returningPromise().then().catch();
        } catch (e) {
          console.log(e);
        }
      }
      `,
          errors: 1,
        },
        {
          code: `
      function returningPromise() { return Promise.reject(); }
      function onlyOnePromiseWhenChainedPromise() {
        try {
          returningPromise().then(() => {});
        } catch (e) {
          console.log(e);
        }
      }
      `,
          errors: 1,
        },
      ],
    });
  });
});
