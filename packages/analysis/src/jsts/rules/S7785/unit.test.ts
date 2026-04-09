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
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
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
});
