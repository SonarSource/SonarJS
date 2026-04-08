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
import {
  NoTypeCheckingRuleTester,
  RuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S7785', () => {
  it('should skip CommonJS files (sourceType: script)', () => {
    const cjsRuleTester = new NoTypeCheckingRuleTester({ sourceType: 'script' });
    cjsRuleTester.run('S7785', rule, {
      valid: [
        {
          code: `(async () => { await fetch('https://example.com'); })();`,
        },
      ],
      invalid: [],
    });
  });

  it('should report in ES modules (sourceType: module)', () => {
    const esmRuleTester = new NoTypeCheckingRuleTester();
    esmRuleTester.run('S7785', rule, {
      valid: [
        {
          code: `await fetch('https://example.com');`,
        },
      ],
      invalid: [
        {
          code: `(async () => { await fetch('https://example.com'); })();`,
          errors: [{ messageId: 'iife' }],
        },
      ],
    });
  });

  it('should not report non-Promise .catch() chains from allowlisted packages (no type checker)', () => {
    // False positive: Zod's .catch() is a synchronous schema transformation method,
    // not Promise.prototype.catch. Suppress via import-source allowlist.
    const ruleTester = new NoTypeCheckingRuleTester();
    ruleTester.run('S7785', rule, {
      valid: [
        {
          // Zod schema with .catch() as default value fallback
          code: `
            import { z } from 'zod';
            const schema = z.string().optional().catch('');
          `,
        },
        {
          // Zod schema with chained .catch() on number
          code: `
            import { z } from 'zod';
            const schema = z.coerce.number().optional().catch(0);
          `,
        },
        {
          // Zod schema with .catch() on boolean
          code: `
            import { z } from 'zod';
            const schema = z.boolean().optional().catch(false);
          `,
        },
        {
          // Zod namespace import with .catch()
          code: `
            import * as z from 'zod';
            const schema = z.string().catch('default');
          `,
        },
        {
          // Multiple Zod fields in z.object(), all with .catch()
          code: `
            import { z } from 'zod';
            const QueryParams = z.object({
              org_id: z.string().optional().catch(''),
              callback_port: z.coerce.number().optional().catch(undefined),
              is_admin_login: z.boolean().optional().catch(false),
            });
          `,
        },
      ],
      invalid: [
        {
          // Real promise chain from fetch() must still be flagged
          code: `
            fetch('https://example.com').catch(err => console.error(err));
          `,
          errors: [{ messageId: 'promise' }],
        },
        {
          // Non-zod import must still be flagged
          code: `
            import { getPromise } from 'some-library';
            getPromise().catch(err => console.error(err));
          `,
          errors: [{ messageId: 'promise' }],
        },
      ],
    });
  });

  it('should not report non-Promise .catch() chains on non-thenable types (with type checker)', () => {
    // False positive: with type information, the receiver of .catch() is a ZodOptional
    // (or similar Zod type) which does not implement PromiseLike, so the report is suppressed.
    const ruleTester = new RuleTester();
    ruleTester.run('S7785', rule, {
      valid: [
        {
          // Zod schema .catch() — ZodOptional has no `then` property
          code: `
            import { z } from 'zod';
            const schema = z.string().optional().catch('');
          `,
        },
        {
          // Zod schema .catch() with undefined default — from the real-world FP
          code: `
            import { z } from 'zod';
            const schema = z.coerce.number().optional().catch(undefined);
          `,
        },
        {
          // Actual top-level await is valid
          code: `
            const result = await fetch('https://example.com');
          `,
        },
        {
          // Custom class with .catch() but no .then() — not a Promise, must not be flagged
          code: `
            class Catchable { catch(fn: (e: unknown) => void) { return this; } }
            new Catchable().catch(() => {});
          `,
        },
        {
          // Custom class with .finally() but no .then() — not a Promise, must not be flagged
          code: `
            class Finalizable { finally(fn: () => void) { return this; } }
            new Finalizable().finally(() => {});
          `,
        },
        {
          // Custom class with both .catch() and .finally() but no .then() — still not a Promise
          code: `
            class Resource {
              catch(fn: (e: unknown) => void) { return this; }
              finally(fn: () => void) { return this; }
            }
            new Resource().catch(() => {}).finally(() => {});
          `,
        },
      ],
      invalid: [
        {
          // Real promise chain — fetch() returns a Promise which has both `then` and `catch`
          code: `
            fetch('https://example.com').catch(err => console.error(err));
          `,
          errors: [{ messageId: 'promise' }],
        },
        {
          // Promise.resolve().then() — PromiseLike must still be flagged
          code: `
            Promise.resolve(42).then(v => console.log(v));
          `,
          errors: [{ messageId: 'promise' }],
        },
        {
          // Custom thenable (has callable .then()) — IS PromiseLike, calling .then() must be flagged
          code: `
            class Thenable { then(onfulfilled: (value: unknown) => void) { return this; } }
            new Thenable().then(v => console.log(v));
          `,
          errors: [{ messageId: 'promise' }],
        },
        {
          // Custom class with both .then() and .catch() — IS Promise-like, calling .catch() must be flagged
          code: `
            class PromiseLike {
              then(resolve: (value: unknown) => void) { return this; }
              catch(reject: (error: unknown) => void) { return this; }
            }
            new PromiseLike().catch(err => console.error(err));
          `,
          errors: [{ messageId: 'promise' }],
        },
        {
          // IIFE must still be flagged regardless
          code: `
            (async () => { await fetch('https://example.com'); })();
          `,
          errors: [{ messageId: 'iife' }],
        },
      ],
    });
  });
});
