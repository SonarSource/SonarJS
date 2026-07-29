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
import path from 'node:path';
import { describe, it } from 'node:test';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';

const ISSUE_MESSAGE =
  'This composite assertion hides which condition failed; split it to make failures actionable.';

describe('S9073', () => {
  it('reports composite assertions', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    const jestFixture = path.join(import.meta.dirname, 'fixtures', 'jest', 'test.js');
    const noDependencyFixture = path.join(
      import.meta.dirname,
      'fixtures',
      'no-dependency',
      'test.js',
    );
    const expectedIssue = { message: ISSUE_MESSAGE };

    ruleTester.run('S9073', rule, {
      valid: [
        {
          code: `
            import assert from 'node:assert';
            assert(a || b);
          `,
        },
        {
          code: `
            import assert from 'node:assert';
            assert.ok(a || b);
          `,
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert(a || b);
          `,
        },
        {
          code: `
            import assert from 'node:assert';
            assert(!(a && b));
          `,
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(a || b).toBeTruthy();
          `,
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(a && b).toBeFalsy();
          `,
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(a && b).toBe(true);
          `,
        },
        {
          // A bare global expect without a Jest dependency is not an assertion.
          filename: noDependencyFixture,
          code: `expect(a && b).toBeTruthy();`,
        },
        {
          code: `
            import { expect } from 'chai';
            expect(a && b).to.be.ok;
          `,
        },
        {
          code: `values.every(value => value && value.active);`,
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert(primaryColumns[0] && primaryColumns[0].length > 0);
          `,
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert(typeof value === 'object' && value !== null);
          `,
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert(value !== null && typeof value === 'object');
          `,
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert(Array.isArray(value) && value.length > 0);
          `,
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert(value instanceof Error && value.message);
          `,
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert('create' in rule && typeof rule.create === 'function');
          `,
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert(isNonEmpty(list) && list[0].id);
          `,
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert(typeof value === 'object' && value.property);
          `,
        },
        {
          // Exempt because `value !== null` checks the reference that both operands use.
          code: `
            import assert from 'node:assert/strict';
            assert(typeof value !== 'object' && value !== null);
          `,
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert(rule && typeof rule === 'object' && typeof rule.create === 'function');
          `,
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert(isPlainObject(object) && typeof object === 'object' && object !== null);
          `,
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(value && value.property).toBeTruthy();
            expect(value && value.property).not.toBeFalsy();
            expect(!(value && value.property)).toBeFalsy();
          `,
        },
      ],
      invalid: [
        {
          code: `
            import assert from 'node:assert';
            assert.ok(a && b);
          `,
          errors: [expectedIssue],
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert(a && b);
          `,
          errors: [expectedIssue],
        },
        {
          code: `
            import assert from 'node:assert';
            assert(!(a || b));
          `,
          errors: [expectedIssue],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(a && b).toBeTruthy();
          `,
          errors: [expectedIssue],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(a && b && c).toBeTruthy();
          `,
          errors: [expectedIssue],
        },
        {
          code: `
            import { expect } from 'bun:test';
            expect(a || b).toBeFalsy();
          `,
          errors: [expectedIssue],
        },
        {
          code: `
            import { expect } from 'bun:test';
            expect(!(a && b)).toBeFalsy();
          `,
          errors: [expectedIssue],
        },
        {
          code: `
            import { expect } from '@jest/globals';
            expect(a || b).not.toBeTruthy();
          `,
          errors: [expectedIssue],
        },
        {
          filename: path.join(import.meta.dirname, 'S9073.ts'),
          code: `
            import { expect } from 'vitest';
            const a: boolean = getA();
            const b: boolean = getB();
            expect(a && b).toBeTruthy();
          `,
          errors: [expectedIssue],
        },
        {
          filename: jestFixture,
          code: `expect(a && b).toBeTruthy();`,
          errors: [expectedIssue],
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert(value && value.property && independentCondition);
          `,
          errors: [expectedIssue],
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert(result.kind === 'success' && result.value);
          `,
          errors: [expectedIssue],
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert(value && other.value);
          `,
          errors: [expectedIssue],
        },
        {
          // A single-argument call is only a guard when its name signals a predicate; an
          // arbitrary call establishes nothing about its argument.
          code: `
            import assert from 'node:assert/strict';
            assert(compute(value) && value.ok);
          `,
          errors: [expectedIssue],
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert(value === null && value.property);
          `,
          errors: [expectedIssue],
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert(values[index++] && values[index++].property);
          `,
          errors: [expectedIssue],
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert(value && items.every(value => value.ready));
          `,
          errors: [expectedIssue],
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert(b >= 0n && b < 2n ** 32n);
          `,
          errors: [expectedIssue],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(token.createdAt >= now && token.createdAt <= Date.now()).toBeTruthy();
          `,
          errors: [expectedIssue],
        },
      ],
    });
  });
});
