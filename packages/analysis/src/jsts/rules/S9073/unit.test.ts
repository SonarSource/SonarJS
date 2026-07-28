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
      ],
    });
  });
});
