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
import { describe } from 'vitest';
function register() {}
describe('user service', register);
describe('payments', getCallback());
describe('orders', cb);
          `,
          filename: 'reference.test.ts',
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
          code: `
import { describe } from 'vitest';
describe('user service', async () => {
  const config = await loadConfig();
  it('returns users', () => {});
});
          `,
          filename: 'service.test.ts',
          errors: [{ messageId: 'asyncCallback' }],
        },
        {
          code: `
const mocha = require('mocha');
describe('user service', async function () {});
          `,
          filename: 'service.test.js',
          errors: [{ messageId: 'asyncCallback' }],
        },
        {
          code: `
import { describe } from 'vitest';
describe('user service', async function* () {});
          `,
          filename: 'gen.test.ts',
          errors: [{ messageId: 'asyncCallback' }],
        },
        {
          // aliases and modifiers with an async callback
          code: `
const jest = require('jest');
suite('billing', async () => {});
context('checkout', async () => {});
describe.only('focused', async () => {});
          `,
          filename: 'aliases.test.js',
          errors: [
            { messageId: 'asyncCallback' },
            { messageId: 'asyncCallback' },
            { messageId: 'asyncCallback' },
          ],
        },
        {
          code: `
import { describe } from 'vitest';
describe('user service', 'register the tests');
          `,
          filename: 'string.test.ts',
          errors: [{ messageId: 'nonFunctionCallback' }],
        },
        {
          // various non-function callbacks
          code: `
const jest = require('jest');
describe('a', undefined);
describe('b', 42);
describe('c', []);
describe('d', {});
describe('e', \`template\`);
          `,
          filename: 'nonfunction.test.js',
          errors: [
            { messageId: 'nonFunctionCallback' },
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
