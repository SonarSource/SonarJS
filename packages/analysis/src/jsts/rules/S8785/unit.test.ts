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
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';
import { describe, it } from 'node:test';
import path from 'node:path';

describe('S8785', () => {
  it('S8785', () => {
    const ruleTester = new DefaultParserRuleTester();
    const noFrameworkFixture = path.join(import.meta.dirname, 'fixtures', 'test.js');
    const vitestGlobalsFixture = path.join(
      import.meta.dirname,
      'fixtures',
      'vitest-globals',
      'suite.test.js',
    );
    const jestGlobalsFixture = path.join(
      import.meta.dirname,
      'fixtures',
      'jest-globals',
      'suite.test.js',
    );
    const mochaGlobalsFixture = path.join(
      import.meta.dirname,
      'fixtures',
      'mocha-globals',
      'suite.test.js',
    );

    ruleTester.run('Test suite callbacks should be synchronous functions', rule, {
      valid: [
        {
          // synchronous arrow / function callbacks
          code: `
import { describe, suite } from 'vitest';
describe('user service', () => {
  it('returns users', () => {});
});
suite('billing', function () {
  it('charges the card', () => {});
});
          `,
          filename: 'service.test.ts',
        },
        {
          // generator callback is a function and not async
          code: `
const mocha = require('mocha');
describe('user service', function* () {
  it('returns users', () => {});
});
          `,
          filename: 'service.test.js',
        },
        {
          // pending suite without a callback is valid
          code: `
import { describe } from 'vitest';
describe('not implemented yet');
          `,
          filename: 'pending.test.ts',
        },
        {
          // callback passed by reference may resolve to a function: do not report
          code: `
const mocha = require('mocha');
function register() {}
describe('user service', register);
describe('payments', getCallback());
describe('orders', cb);
          `,
          filename: 'reference.test.js',
        },
        {
          // modifiers and aliases with a synchronous callback
          code: `
const jest = require('jest');
describe.only('focused', () => {});
describe.skip('skipped', function () {});
context('a context', () => {});
          `,
          filename: 'modifiers.test.js',
        },
        {
          // Vitest awaits the suite callback, so async callbacks are safe there
          code: `
import { describe, suite, test } from 'vitest';
describe('user service', async () => {
  const config = await loadConfig();
  test('returns users', () => {});
});
suite('billing', async function () {});
describe.only('focused', async () => {});
          `,
          filename: 'vitest-async.test.ts',
        },
        {
          // Vitest async generator callback is also safe
          code: `
import { describe } from 'vitest';
describe('user service', async function* () {});
          `,
          filename: 'vitest-gen.test.ts',
        },
        {
          // `describe(name, options, fn)` form: the callback is the third argument, the second is
          // an options object and must not be mistaken for a non-function callback
          code: `
import { describe } from 'vitest';
describe('suite 2', { tags: ['e2e'] }, () => {
  test('test 2', () => {});
});
describe('options only', { concurrent: true });
          `,
          filename: 'options.test.ts',
        },
        {
          // global describe in a Vitest-only project (globals: true) is resolved to Vitest
          code: `
describe('user service', async () => {
  await loadConfig();
  it('returns users', () => {});
});
          `,
          filename: vitestGlobalsFixture,
        },
        {
          // no supported test framework: rule does not apply
          code: `
describe('user service', async () => {});
describe('payments', 'not a function');
          `,
          filename: noFrameworkFixture,
        },
      ],
      invalid: [
        {
          // Mocha does not await the callback: tests after `await` are silently skipped
          code: `
describe('user service', async () => {
  const config = await loadConfig();
  it('returns users', () => {});
});
describe('billing', async function () {});
          `,
          filename: mochaGlobalsFixture,
          errors: [{ messageId: 'asyncCallback' }, { messageId: 'asyncCallback' }],
        },
        {
          // Jest globals (globals are unresolved, so the framework comes from the dependency):
          // async callback, including aliases, modifiers and async generators, is a bug
          code: `
describe('user service', async () => {});
suite('billing', async function () {});
context('checkout', async () => {});
describe.only('focused', async () => {});
describe('async generator', async function* () {});
          `,
          filename: jestGlobalsFixture,
          errors: [
            { messageId: 'asyncCallback' },
            { messageId: 'asyncCallback' },
            { messageId: 'asyncCallback' },
            { messageId: 'asyncCallback' },
            { messageId: 'asyncCallback' },
          ],
        },
        {
          // a non-function callback is a mistake in every framework, Vitest included
          code: `
import { describe } from 'vitest';
describe('user service', 'register the tests');
          `,
          filename: 'string.test.ts',
          errors: [{ messageId: 'nonFunctionCallback' }],
        },
        {
          // various non-function callbacks (an object is excluded: it is a plausible options arg)
          code: `
const jest = require('jest');
describe('a', undefined);
describe('b', 42);
describe('c', []);
describe('e', \`template\`);
          `,
          filename: 'nonfunction.test.js',
          errors: [
            { messageId: 'nonFunctionCallback' },
            { messageId: 'nonFunctionCallback' },
            { messageId: 'nonFunctionCallback' },
            { messageId: 'nonFunctionCallback' },
          ],
        },
      ],
    });
  });
});
