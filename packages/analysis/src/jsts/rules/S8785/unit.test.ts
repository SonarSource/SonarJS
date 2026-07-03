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
import {
  DefaultParserRuleTester,
  RuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
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

    const RULE_NAME = 'Test suite callbacks should be synchronous functions';
    ruleTester.run(RULE_NAME, rule, {
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
          // `@jest/globals` is a supported Jest entry point and must be detected like `jest`
          code: `import { describe } from '@jest/globals';
describe('user service', async () => {
  await setup();
});`,
          filename: 'service.test.ts',
          errors: [{ messageId: 'asyncSuiteCallback' }],
        },
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
          errors: [{ messageId: 'asyncSuiteCallback' }, { messageId: 'asyncSuiteCallback' }],
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
          errors: [{ messageId: 'asyncSuiteCallback' }],
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
          errors: [{ messageId: 'asyncSuiteCallback' }],
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
            { messageId: 'asyncSuiteCallback' },
            { messageId: 'asyncSuiteCallback' },
            { messageId: 'asyncSuiteCallback' },
            { messageId: 'asyncSuiteCallback' },
            { messageId: 'asyncSuiteCallback' },
          ],
        },
        {
          // Mocha aliases context() and suite()
          code: `
context('checkout', async () => { await a(); });
suite('billing', async function () { await b(); });
          `,
          filename: mochaGlobals,
          errors: [{ messageId: 'asyncSuiteCallback' }, { messageId: 'asyncSuiteCallback' }],
        },
        {
          // Cypress globals (project depends on cypress)
          code: `
describe('e2e', async () => { await a(); });
context('group', async () => { await b(); });
          `,
          filename: cypressGlobals,
          errors: [{ messageId: 'asyncSuiteCallback' }, { messageId: 'asyncSuiteCallback' }],
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
                  message:
                    'Move this async setup into a lifecycle hook or a test callback; any test declared after this "await" is silently dropped.',
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
          // secondary locations also cover registrations nested in blocks (if/try/loops) after the
          // await: they are dropped too. The walk stops at function boundaries, so the `it` inside
          // the dropped nested `describe` is not collected separately (only the `describe` callee).
          code: `describe('svc', async () => {
  await loadConfig();
  if (cond) {
    it('a', () => {});
    describe('inner', () => {
      it('b', () => {});
    });
  }
});`,
          filename: mochaGlobals,
          settings: { sonarRuntime: true },
          errors: [
            {
              messageId: 'sonarRuntime',
              data: {
                sonarRuntimeData: JSON.stringify({
                  message:
                    'Move this async setup into a lifecycle hook or a test callback; any test declared after this "await" is silently dropped.',
                  secondaryLocations: [
                    {
                      message: 'This test is declared after the await and is never registered.',
                      column: 4,
                      line: 4,
                      endColumn: 6,
                      endLine: 4,
                    },
                    {
                      message: 'This test is declared after the await and is never registered.',
                      column: 4,
                      line: 5,
                      endColumn: 12,
                      endLine: 5,
                    },
                  ],
                }),
              },
            },
          ],
        },
        {
          // secondary locations for a `for await...of` suspension cover tests declared *inside* the
          // loop body as well as after it: the loop suspends on the first `iterator.next()`, so its
          // body never runs during discovery and every registration there is dropped too.
          code: `describe('svc', async () => {
  for await (const chunk of stream()) {
    it('inside', () => {});
  }
  it('after', () => {});
});`,
          filename: mochaGlobals,
          settings: { sonarRuntime: true },
          errors: [
            {
              messageId: 'sonarRuntime',
              data: {
                sonarRuntimeData: JSON.stringify({
                  message:
                    'Move this async setup into a lifecycle hook or a test callback; any test declared after this "await" is silently dropped.',
                  secondaryLocations: [
                    {
                      message: 'This test is declared after the await and is never registered.',
                      column: 4,
                      line: 3,
                      endColumn: 6,
                      endLine: 3,
                    },
                    {
                      message: 'This test is declared after the await and is never registered.',
                      column: 2,
                      line: 5,
                      endColumn: 4,
                      endLine: 5,
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

    const typedRuleTester = new RuleTester();
    typedRuleTester.run(RULE_NAME, rule, {
      valid: [
        {
          // sync helper is never async — no issue
          code: `import { describe } from 'mocha';
function setup() { return 42; }
describe('suite', () => { setup(); });`,
        },
        {
          // async helper has no tests after its await — nothing dropped
          code: `import { describe } from 'mocha';
async function setup() { await Promise.resolve(); }
describe('suite', () => { setup(); });`,
        },
        {
          // async helper has tests but BEFORE its await — nothing dropped
          code: `import { describe } from 'mocha';
async function setup() {
  it('before', () => {});
  await Promise.resolve();
}
describe('suite', () => { setup(); });`,
        },
        {
          // only one hop is followed for referenced suite callbacks
          code: `import { describe } from 'mocha';
async function setup() {
  await Promise.resolve();
  it('dropped', () => {});
}
const register = setup;
describe('suite', register);`,
        },
        {
          // cross-file helper via declare: no ESTree body available — skip
          code: `import { describe } from 'mocha';
declare function asyncHelper(): Promise<void>;
describe('suite', () => { asyncHelper(); });`,
        },
      ],
      invalid: [
        {
          // async callback passed by reference to a named function: report on the declaration,
          // but do not auto-fix because the function may be reused elsewhere
          code: `import { describe } from 'mocha';
async function register() {
  it('registered', () => {});
}
describe('suite', register);`,
          errors: [{ messageId: 'removeAsync' }],
        },
        {
          // async callback passed by reference through a variable initializer is also resolved
          code: `import { describe } from 'mocha';
const register = async () => {
  await Promise.resolve();
  it('dropped', () => {});
};
describe('suite', register);`,
          errors: [{ messageId: 'asyncSuiteCallback' }],
        },
        {
          // one-hop resolution also catches named async function declarations with dropped tests
          code: `import { describe } from 'mocha';
async function register() {
  await Promise.resolve();
  it('dropped', () => {});
}
describe('suite', register);`,
          errors: [{ messageId: 'asyncSuiteCallback' }],
        },
        {
          // the callback can still be found when the suite title is itself passed by reference
          code: `import { describe } from 'mocha';
const title = 'suite';
async function register() {
  await Promise.resolve();
  it('dropped', () => {});
}
describe(title, register);`,
          errors: [{ messageId: 'asyncSuiteCallback' }],
        },
        {
          // Sync describe + unawaited async helper with dropped tests
          code: `import { describe } from 'mocha';
async function testing() {
  await Promise.resolve();
  it('dropped', () => {});
}
describe('suite', () => {
  testing();
});`,
          errors: [{ messageId: 'asyncHelperCall' }],
        },
        {
          // top-level await inside a variable initializer still drops later tests in the helper
          code: `import { describe } from 'mocha';
async function testing() {
  const value = await Promise.resolve();
  it('dropped', () => {});
}
describe('suite', () => {
  testing();
});`,
          errors: [{ messageId: 'asyncHelperCall' }],
        },
        {
          // Async describe (no top-level await) + unawaited async helper
          // removeAsync (with QF) + asyncHelperCall both fire
          code: `import { describe } from 'mocha';
async function testing() {
  await Promise.resolve();
  it('dropped', () => {});
}
describe('suite', async () => {
  testing();
});`,
          errors: [
            {
              messageId: 'removeAsync',
              suggestions: [
                {
                  messageId: 'removeAsyncQuickFix',
                  output: `import { describe } from 'mocha';
async function testing() {
  await Promise.resolve();
  it('dropped', () => {});
}
describe('suite', () => {
  testing();
});`,
                },
              ],
            },
            { messageId: 'asyncHelperCall' },
          ],
        },
        {
          // Async describe + top-level await that IS the async helper
          // asyncHelperCall fires, asyncSuiteCallback suppressed
          code: `import { describe } from 'mocha';
async function testing() {
  await Promise.resolve();
  it('dropped in helper', () => {});
}
describe('suite', async () => {
  await testing();
});`,
          errors: [{ messageId: 'asyncHelperCall' }],
        },
        {
          // Tests dropped in both the helper body and the describe body
          code: `import { describe } from 'mocha';
async function testing() {
  await Promise.resolve();
  it('dropped in helper', () => {});
}
describe('suite', async () => {
  await testing();
  it('dropped in describe', () => {});
});`,
          errors: [{ messageId: 'asyncHelperCall' }],
        },
        {
          // Async describe + non-helper top-level await + unawaited async helper
          // asyncSuiteCallback + asyncHelperCall both fire independently
          code: `import { describe } from 'mocha';
async function testing() {
  await Promise.resolve();
  it('dropped in helper', () => {});
}
describe('suite', async () => {
  await Promise.resolve();
  it('dropped in describe', () => {});
  testing();
});`,
          errors: [{ messageId: 'asyncSuiteCallback' }, { messageId: 'asyncHelperCall' }],
        },
        {
          // sonarRuntime — asyncHelperCall secondary locations: tests inside the helper
          code: `import { describe } from 'mocha';
async function testing() {
  await Promise.resolve();
  it('dropped', () => {});
}
describe('suite', () => {
  testing();
});`,
          settings: { sonarRuntime: true },
          errors: [
            {
              messageId: 'sonarRuntime',
              data: {
                sonarRuntimeData: JSON.stringify({
                  message:
                    'This async helper silently drops tests; remove its "async" keyword and move async setup into a lifecycle hook or a test callback.',
                  secondaryLocations: [
                    {
                      message: 'This test is declared after the await and is never registered.',
                      column: 2,
                      line: 4,
                      endColumn: 4,
                      endLine: 4,
                    },
                  ],
                }),
              },
            },
          ],
        },
        {
          // sonarRuntime — awaited async helper: secondaries from helper body + describe body
          code: `import { describe } from 'mocha';
async function testing() {
  await Promise.resolve();
  it('dropped in helper', () => {});
}
describe('suite', async () => {
  await testing();
  it('dropped in describe', () => {});
});`,
          settings: { sonarRuntime: true },
          errors: [
            {
              messageId: 'sonarRuntime',
              data: {
                sonarRuntimeData: JSON.stringify({
                  message:
                    'This async helper silently drops tests; remove its "async" keyword and move async setup into a lifecycle hook or a test callback.',
                  secondaryLocations: [
                    {
                      message: 'This test is declared after the await and is never registered.',
                      column: 2,
                      line: 4,
                      endColumn: 4,
                      endLine: 4,
                    },
                    {
                      message: 'This test is declared after the await and is never registered.',
                      column: 2,
                      line: 8,
                      endColumn: 4,
                      endLine: 8,
                    },
                  ],
                }),
              },
            },
          ],
        },
      ],
    });
  });
});
