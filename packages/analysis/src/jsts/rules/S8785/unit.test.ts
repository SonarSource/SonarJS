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
    const fixture = (folder: string) =>
      path.join(import.meta.dirname, 'fixtures', folder, 'suite.test.js');
    const noFrameworkFixture = path.join(import.meta.dirname, 'fixtures', 'test.js');
    const jestGlobals = fixture('jest-globals');
    const mochaGlobals = fixture('mocha-globals');
    const cypressGlobals = fixture('cypress-globals');

    ruleTester.run('Test suite callbacks should be synchronous functions', rule, {
      valid: [
        {
          // synchronous arrow / function callbacks
          code: `
import { describe, suite, context } from 'mocha';
describe('user service', () => {
  it('returns users', () => {});
});
suite('billing', function () {});
context('checkout', () => {});
          `,
          filename: 'service.test.ts',
        },
        {
          // a non-async generator callback is fine
          code: `
import { describe } from 'mocha';
describe('user service', function* () {});
          `,
          filename: 'service.test.ts',
        },
        {
          // pending suite without a callback is valid
          code: `
import { describe } from 'mocha';
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
          // skip and focus-skip variants are excluded: their tests never run anyway
          code: `
describe.skip('a', async () => {});
xdescribe('b', async () => {});
describe.skip.each([1])('c', async () => {});
xdescribe.each([1])('d', async () => {});
          `,
          filename: jestGlobals,
        },
        {
          // Mocha skip variants are excluded too
          code: `
context.skip('a', async () => {});
suite.skip('b', async () => {});
describe.skip('c', async () => {});
          `,
          filename: mochaGlobals,
        },
        {
          // A Vitest-only project (no jest/mocha/cypress dependency) is out of scope: Vitest
          // awaits the suite callback, so an async callback is safe there
          code: `
import { describe } from 'vitest';
describe('user service', async () => {
  await loadConfig();
  it('returns users', () => {});
});
          `,
          filename: noFrameworkFixture,
        },
        {
          // a Vitest import is excluded even when the project also uses Mocha
          code: `
import { describe } from 'vitest';
const mocha = require('mocha');
describe('user service', async () => {
  await loadConfig();
  it('returns users', () => {});
});
          `,
          filename: 'mixed.test.ts',
        },
        {
          // a locally-defined function named describe is not a framework suite
          code: `
const mocha = require('mocha');
function describe(cb) {}
describe(async () => {});
          `,
          filename: 'local.test.js',
        },
        {
          // no supported test framework: rule does not apply
          code: `
describe('user service', async () => {});
          `,
          filename: noFrameworkFixture,
        },
        {
          // an await nested inside another function is not a top-level await of the suite callback,
          // and a synchronous suite callback is always fine
          code: `
import { describe } from 'mocha';
describe('user service', () => {
  it('returns users', async () => {
    await loadConfig();
  });
});
          `,
          filename: 'nested.test.ts',
        },
      ],
      invalid: [
        {
          // async callback without a top-level await: remove the misleading async keyword
          code: `import { describe } from 'mocha';
describe('user service', async () => {
  it('returns users', () => {});
});`,
          filename: 'service.test.ts',
          errors: [
            {
              messageId: 'removeAsync',
              suggestions: [
                {
                  messageId: 'removeAsyncQuickFix',
                  output: `import { describe } from 'mocha';
describe('user service', () => {
  it('returns users', () => {});
});`,
                },
              ],
            },
          ],
        },
        {
          // a nested suite is flagged independently of its (synchronous) parent, and the quick fix
          // removes only the nested async keyword
          code: `describe('outer', () => {
  describe('inner', async () => {
    it('returns users', () => {});
  });
});`,
          filename: mochaGlobals,
          errors: [
            {
              messageId: 'removeAsync',
              suggestions: [
                {
                  messageId: 'removeAsyncQuickFix',
                  output: `describe('outer', () => {
  describe('inner', () => {
    it('returns users', () => {});
  });
});`,
                },
              ],
            },
          ],
        },
        {
          // both an async parent and an async nested suite are flagged
          code: `
describe('outer', async () => {
  await setup();
  describe('inner', async () => {
    await innerSetup();
  });
});
          `,
          filename: mochaGlobals,
          errors: [{ messageId: 'moveAsyncSetup' }, { messageId: 'moveAsyncSetup' }],
        },
        {
          // async callback with a top-level await: tests declared after it are silently dropped
          code: `
describe('user service', async () => {
  const config = await loadConfig();
  it('returns users', () => {});
});
          `,
          filename: mochaGlobals,
          errors: [{ messageId: 'moveAsyncSetup' }],
        },
        {
          // a top-level `for await...of` is also an awaiting suite callback
          code: `
describe('user service', async () => {
  for await (const chunk of stream()) {}
  it('returns users', () => {});
});
          `,
          filename: mochaGlobals,
          errors: [{ messageId: 'moveAsyncSetup' }],
        },
        {
          // Jest variants: aliases, modifiers, and the curried .each forms all raise
          code: `
describe.only('a', async () => { await a(); });
fdescribe('b', async () => { await b(); });
describe.each([1])('c', async () => { await c(); });
describe.only.each([1])('d', async () => { await d(); });
fdescribe.each([1])('e', async () => { await e(); });
          `,
          filename: jestGlobals,
          errors: [
            { messageId: 'moveAsyncSetup' },
            { messageId: 'moveAsyncSetup' },
            { messageId: 'moveAsyncSetup' },
            { messageId: 'moveAsyncSetup' },
            { messageId: 'moveAsyncSetup' },
          ],
        },
        {
          // Mocha aliases context() and suite()
          code: `
context('checkout', async () => { await a(); });
suite('billing', async function () { await b(); });
          `,
          filename: mochaGlobals,
          errors: [{ messageId: 'moveAsyncSetup' }, { messageId: 'moveAsyncSetup' }],
        },
        {
          // Cypress globals (project depends on cypress)
          code: `
describe('e2e', async () => { await a(); });
context('group', async () => { await b(); });
          `,
          filename: cypressGlobals,
          errors: [{ messageId: 'moveAsyncSetup' }, { messageId: 'moveAsyncSetup' }],
        },
        {
          // secondary locations point at the tests dropped after the await
          code: `describe('user service', async () => {
  await loadConfig();
  it('returns users', () => {});
});`,
          filename: mochaGlobals,
          settings: { sonarRuntime: true },
          errors: [
            {
              messageId: 'sonarRuntime',
              data: {
                sonarRuntimeData: JSON.stringify({
                  message: 'Move this asynchronous setup into a "beforeAll" or "beforeEach" hook.',
                  secondaryLocations: [
                    {
                      message: 'This test is declared after the await and is never registered.',
                      column: 2,
                      line: 3,
                      endColumn: 4,
                      endLine: 3,
                    },
                  ],
                }),
              },
            },
          ],
        },
        {
          // regression: the rule declares `hasSecondaries`, so under sonarRuntime the linter
          // decodes every message of S8785 as JSON. The removeAsync report (which carries no
          // secondary locations) must be encoded too, otherwise the decoder crashes parsing a
          // plain string. See the matching `report` call in rule.ts.
          code: `describe('user service', async () => {
  it('returns users', () => {});
});`,
          filename: mochaGlobals,
          settings: { sonarRuntime: true },
          errors: [
            {
              messageId: 'sonarRuntime',
              data: {
                sonarRuntimeData: JSON.stringify({
                  message:
                    'Remove the "async" keyword from this test suite callback; a test suite callback must be synchronous.',
                  secondaryLocations: [],
                }),
              },
              suggestions: [
                {
                  messageId: 'removeAsyncQuickFix',
                  output: `describe('user service', () => {
  it('returns users', () => {});
});`,
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
