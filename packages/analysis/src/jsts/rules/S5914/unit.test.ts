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
import { describe, it } from 'node:test';
import path from 'node:path';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';

describe('S5914', () => {
  it('reports assertions that always succeed or fail', () => {
    process.chdir(import.meta.dirname);
    const ruleTester = new NoTypeCheckingRuleTester();
    const jestFixture = path.join(import.meta.dirname, 'fixtures', 'jest', 'test.js');

    ruleTester.run('no-trivial-assertions', rule, {
      valid: [
        {
          code: `expect(true).toBeTruthy();`,
          filename: 'fixtures/no-dependency/test.js',
        },
        {
          code: `assert(false);`,
          filename: 'fixtures/no-dependency/test.js',
        },
        {
          code: `const value = true; expect(value).toBeTruthy();`,
          filename: jestFixture,
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(isReady()).toBeTruthy();
          `,
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(count()).toBe(0);
          `,
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(getUser()).toEqual({ id: 1 });
          `,
        },
        {
          code: `
            import assert from 'node:assert';
            assert.ok(loadConfig());
          `,
        },
        {
          code: `
            import assert from 'node:assert';
            assert.deepStrictEqual(getUser(), {});
          `,
        },
        {
          code: `const value: boolean = true; expect(value).toBeTruthy();`,
          filename: path.join(import.meta.dirname, 'fixtures', 'jest', 'test.ts'),
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(Boolean(value)).toBeTruthy();
          `,
        },
        {
          code: `
            import assert from 'node:assert';
            assert.strictEqual(getValue(), new Value());
          `,
        },
      ],
      invalid: [
        {
          code: `
            import { expect } from 'vitest';
            expect(true).toBeTruthy();
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(0).toBeFalsy();
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(undefined).toBeDefined();
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(null).not.toBeNull();
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect({}).toBeTruthy();
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(class {}).toBeDefined();
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(getValue()).toBe({});
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect([]).not.toBe(getValue());
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `expect(true).toBeTruthy();`,
          filename: jestFixture,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import assert from 'node:assert';
            assert.ok("ready");
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import assert from 'node:assert';
            assert(false);
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import assert from 'node:assert';
            assert.strictEqual(getValue(), {});
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import assert from 'node:assert';
            assert.notStrictEqual(getItems(), []);
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { strictEqual as same } from 'node:assert';
            same(getValue(), {});
          `,
          errors: [{ messageId: 'issue' }],
        },
      ],
    });
  });
});
