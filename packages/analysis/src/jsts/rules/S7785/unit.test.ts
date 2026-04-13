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
import { rules as unicornRules } from '../external/unicorn.js';
import {
  NoTypeCheckingRuleTester,
  RuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

// Sentinel: verify that the upstream unicorn rule still raises on the Zod .catch() patterns our
// decorator suppresses. If this test starts failing, it signals that the decorator can be removed.
describe('S7785 upstream sentinel', () => {
  it('upstream prefer-top-level-await raises on Zod .catch() pattern that decorator suppresses', () => {
    const sentinelTester = new NoTypeCheckingRuleTester();
    sentinelTester.run('prefer-top-level-await', unicornRules['prefer-top-level-await'], {
      valid: [],
      invalid: [
        {
          // Zod string schema .catch() — suppressed by decorator, raised by upstream
          code: `import { z } from 'zod';
                 const nameSchema = z.string().optional().catch('');`,
          errors: [{ messageId: 'promise' }],
        },
      ],
    });
  });
});

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

  it('should suppress .catch() on Zod schema objects imported from zod (no type-checker mode)', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    ruleTester.run('S7785', rule, {
      valid: [
        {
          // Compliant: Zod string schema .catch()
          code: `import { z } from 'zod';
                 const nameSchema = z.string().optional().catch('');`,
        },
        {
          // Compliant: Zod object schema with nested .catch() calls
          code: `import { z } from 'zod';
                 const QueryParams = z.object({
                   org_id: z.string().optional().catch(''),
                   is_admin_login: z.boolean().optional().catch(false),
                   port: z.coerce.number().optional().catch(undefined),
                 });`,
        },
        {
          // Compliant: Zod record schema .catch()
          code: `import { z } from 'zod';
                 const layoutSchema = z.record(z.string(), z.number()).catch({ left: 30, right: 30 });`,
        },
      ],
      invalid: [
        {
          // Non-compliant: global fetch — not from an import
          code: `fetch('/api').catch(console.error);`,
          errors: [{ messageId: 'promise' }],
        },
        {
          // Non-compliant: global Promise
          code: `Promise.resolve(42).then(console.log);`,
          errors: [{ messageId: 'promise' }],
        },
        {
          // Non-compliant: global Promise .finally() chains should also be reported
          code: `Promise.resolve(42).finally(() => console.log('done'));`,
          errors: [{ messageId: 'promise' }],
        },
        {
          // Non-compliant: import not from 'zod'
          code: `import { schema } from 'my-internal-lib';
                 schema.catch(console.error);`,
          errors: [{ messageId: 'promise' }],
        },
        {
          // Non-compliant: new expression — chain root is not an Identifier
          code: `new MyPromise().catch(console.error);`,
          errors: [{ messageId: 'promise' }],
        },
      ],
    });
  });

  it('should use type information when available (type-checker mode)', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('S7785', rule, {
      valid: [
        {
          // Suppress: Zod schema .catch() — ZodOptional is not assignable to Promise
          code: `import { z } from 'zod';
                 const schema = z.string().optional().catch('');`,
        },
        {
          code: `import * as z from 'zod';
                 const schema = z.string().optional().catch('');`,
        },
        {
          // Suppress: custom synchronous class with .catch() — not PromiseLike
          code: `class Schema {
                   catch(defaultValue: number): this { return this; }
                 }
                 const schema = new Schema();
                 schema.catch(0);`,
        },
        {
          // Suppress: custom synchronous class with .finally() — not PromiseLike
          code: `class Schema {
                   finally(onFinally: () => void): this {
                     onFinally();
                     return this;
                   }
                 }
                 const schema = new Schema();
                 schema.finally(() => {});`,
        },
      ],
      invalid: [
        {
          // Warn: fetch returns Promise<Response> — .then() on PromiseLike
          code: `fetch('/api').then(r => r.json());`,
          errors: [{ messageId: 'promise' }],
        },
        {
          // Warn: Promise.resolve returns Promise<number> — .catch() on Promise
          code: `Promise.resolve(42).catch(console.error);`,
          errors: [{ messageId: 'promise' }],
        },
        {
          // Warn: Promise.resolve returns Promise<number> — .finally() on Promise
          code: `Promise.resolve(42).finally(() => console.log('done'));`,
          errors: [{ messageId: 'promise' }],
        },
        {
          // Warn: custom thenable with .finally() should be treated like a promise chain
          code: `type ThenableWithFinally<T> = PromiseLike<T> & {
                   finally(onFinally: () => void): ThenableWithFinally<T>;
                 };
                 declare const task: ThenableWithFinally<number>;
                 task.finally(() => {});`,
          errors: [{ messageId: 'promise' }],
        },
        {
          // Warn: async function returns Promise — .then() on PromiseLike
          code: `async function loadData() { return 42; }
                 loadData().then(console.log);`,
          errors: [{ messageId: 'promise' }],
        },
        {
          // Warn: callable `then` exposed through a getter is still awaitable
          code: `class AccessorThenable {
                   get then(): (onfulfilled?: (value: number) => void) => AccessorThenable {
                     return onfulfilled => {
                       onfulfilled?.(42);
                       return this;
                     };
                   }
                 }
                 new AccessorThenable().then(console.log);`,
          errors: [{ messageId: 'promise' }],
        },
        {
          // Warn: 'any' type — warn conservatively since it may be a Promise
          code: `declare const x: any;
                 x.then(console.log);`,
          errors: [{ messageId: 'promise' }],
        },
      ],
    });
  });
});
