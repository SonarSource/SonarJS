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
import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S4634', () => {
  it('S4634', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('Shorthand promises should be used', rule, {
      valid: [
        {
          code: `let fulfilledPromise = new Promise(resolve => { resolve(calc(42));  console.log("foo"); });`,
        },
        {
          code: `let fulfilledPromise = Promise.resolve(42);`,
        },
        {
          code: `let fulfilledPromise = Promise.reject('fail');`,
        },
        {
          code: `
      function calc(x:number): number { return x * 2; }
      let somePromise = new Promise(() => { calc(42); }); // 0 parameters
      `,
        },
      ],
      invalid: [
        {
          code: `
      let fulfilledPromise = new Promise(resolve => resolve(calc(42)));
      `,
          errors: [
            {
              message: `Replace this trivial promise with "Promise.resolve".`,
              line: 2,
              endLine: 2,
              column: 34,
              endColumn: 41,
              suggestions: [
                {
                  desc: 'Replace with "Promise.resolve"',
                  output: `
      let fulfilledPromise = Promise.resolve(calc(42));
      `,
                },
              ],
            },
          ],
        },
        {
          code: `let rejectedPromise = new Promise((resolve, reject) => reject(new Error('fail')));`,
          errors: [
            {
              message: `Replace this trivial promise with "Promise.reject".`,
              suggestions: [
                {
                  desc: 'Replace with "Promise.reject"',
                  output: `let rejectedPromise = Promise.reject(new Error('fail'));`,
                },
              ],
            },
          ],
        },
        {
          code: `let rejectedPromise = new Promise((p1, p2) => p2(new Error('fail')));`,
          errors: [
            {
              message: `Replace this trivial promise with "Promise.reject".`,
              suggestions: [
                {
                  desc: 'Replace with "Promise.reject"',
                  output: `let rejectedPromise = Promise.reject(new Error('fail'));`,
                },
              ],
            },
          ],
        },
        {
          code: `new Promise(resolve => resolve(calc(42)));`,
          errors: [
            {
              messageId: 'promiseAction',
              suggestions: [
                {
                  desc: 'Replace with "Promise.resolve"',
                  output: 'Promise.resolve(calc(42));',
                },
              ],
            },
          ],
        },
        {
          code: `new Promise((resolve, reject) => reject(new Error('fail')));`,
          errors: [
            {
              messageId: 'promiseAction',
              suggestions: [
                {
                  desc: 'Replace with "Promise.reject"',
                  output: `Promise.reject(new Error('fail'));`,
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
