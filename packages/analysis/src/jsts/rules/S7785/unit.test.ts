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
import { rules } from '../external/unicorn.js';
import {
  NoTypeCheckingRuleTester,
  RuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

const upstreamRule = rules['prefer-top-level-await'];

// Sentinel: verify that the upstream ESLint rule still raises on the patterns our decorator fixes.
// If this test starts failing (i.e., the upstream rule no longer reports these patterns),
// it signals that the decorator's isStoredForLaterConsumption suppression can be safely removed.
describe('S7785 upstream sentinel', () => {
  it('upstream prefer-top-level-await raises on chains handed to a Promise-typed destination that decorator suppresses', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('prefer-top-level-await', upstreamRule, {
      valid: [],
      invalid: [
        // typed call argument — suppressed by decorator, raised by upstream
        {
          code: `function doWork(arg: Promise<number>) {}
                 doWork(Promise.resolve(42).then(x => x).catch(() => 0));`,
          errors: 1,
        },
        // typed assignment target — suppressed by decorator, raised by upstream
        {
          code: `const holder: { promise: Promise<number> } = { promise: Promise.resolve(0) };
                 holder.promise = Promise.resolve(42).then(x => x).catch(() => 0);`,
          errors: 1,
        },
      ],
    });
  });
});

describe('S7785', () => {
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

  it('should rely on upstream no-typechecker handling for Zod schema objects', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    ruleTester.run('S7785', rule, {
      valid: [
        {
          // Compliant: Zod string schema .catch() via upstream Unicorn heuristic
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
          // Non-compliant: import not from 'zod' and not using a schema-like identifier name
          code: `import { validator } from 'my-internal-lib';
                 validator.catch(console.error);`,
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
        {
          // FP repro: chain passed to a parameter explicitly typed as Promise —
          // intentionally handed off to be awaited later, not a floating top-level chain
          code: `function doWork(arg: Promise<number>) {}
                 doWork(Promise.resolve(42).then(x => x).catch(() => 0));`,
        },
        {
          // FP repro: chain assigned to a property explicitly typed as Promise —
          // intentionally stored to be awaited later, not a floating top-level chain
          code: `const holder: { promise: Promise<number> } = { promise: Promise.resolve(0) };
                 holder.promise = Promise.resolve(42).then(x => x).catch(() => 0);`,
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
        {
          // Warn: destination parameter is typed but not Promise-typed — still floating
          code: `function log(arg: unknown) {}
                 log(Promise.resolve(42).then(x => x).catch(() => 0));`,
          errors: [{ messageId: 'promise' }],
        },
        {
          // Warn: destination variable is typed but not Promise-typed — still floating
          code: `let sink: unknown;
                 sink = Promise.resolve(42).then(x => x).catch(() => 0);`,
          errors: [{ messageId: 'promise' }],
        },
        {
          // Warn: `as` assertion forces a Promise contextual type but nothing consumes the
          // chain — it is still floating, so the assertion must not suppress the report
          code: `Promise.resolve(42).then(x => x) as Promise<number>;`,
          errors: [{ messageId: 'promise' }],
        },
        {
          // Warn: `satisfies` assertion likewise does not consume the floating chain
          code: `Promise.resolve(42).then(x => x) satisfies Promise<number>;`,
          errors: [{ messageId: 'promise' }],
        },
      ],
    });
  });
});
