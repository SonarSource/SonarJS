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
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S9382', () => {
  it('S9382', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('no-await-in-loop', rule, {
      valid: [
        valid(`
    async function foo() {
      for await (const x of gen()) {
        await bar(x); // Compliant: asynchronous iteration is the purpose of for-await-of
      }
    }`),

        valid(`
    async function foo(arr) {
      for (const x of arr) {
        bar(x);
      }
    }`),

        valid(`
    async function foo(arr) {
      await bar();
      for (const x of arr) {
        baz(x);
      }
    }`),

        valid(`
    async function foo(arr) {
      for (const x of arr) {
        promises.push((async () => { await bar(x); })()); // Compliant: await is inside a nested function
      }
    }`),

        valid(`
    async function foo() {
      for await (const x of await getAsyncIterable()) {
        bar(x); // Compliant: the await in the for-await-of header is not reported either
      }
    }`),
      ],

      invalid: [
        invalid(`
    async function foo(arr) {
      for (const x of arr) {
        await bar(x);
      }
    }`),

        invalid(`
    async function foo(arr) {
      for (let i = 0; i < arr.length; i++) {
        await bar(arr[i]);
      }
    }`),

        invalid(`
    async function foo() {
      while (cond()) {
        await bar();
      }
    }`),

        invalid(`
    async function foo() {
      do {
        await bar();
      } while (cond());
    }`),

        invalid(`
    async function foo(obj) {
      for (const key in obj) {
        await bar(key);
      }
    }`),
      ],
    });
  });
});

function invalid(code: string) {
  return {
    code,
    errors: [
      {
        messageId: 'unexpectedAwait',
      },
    ],
  };
}

function valid(code: string) {
  return {
    code,
  };
}
