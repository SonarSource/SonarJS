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

const messageId = 'emptyDataset';

describe('S8998', () => {
  it('reports runnable Jest and Vitest parameterized declarations with empty datasets', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    const jestFixture = path.join(import.meta.dirname, 'fixtures', 'jest', 'test.js');

    ruleTester.run('Parameterized tests should not have empty datasets', rule, {
      valid: [
        {
          code: `
            import { test } from '@jest/globals';
            test.each([[1]])('case %i', value => expect(value).toBe(1));
          `,
        },
        {
          code: `
            import { suite } from 'vitest';
            const cases: number[] = [[1]];
            suite.each(cases)('case %i', () => {});
          `,
        },
        {
          code: `
            import { test } from 'vitest';
            const cases: number[] = [];
            cases.push(1);
            test.each(cases)('case %i', () => {});
          `,
        },
        {
          code: `
            import { test } from 'vitest';
            test.skip.each([])('case %i', () => {});
          `,
        },
        {
          code: `
            import { test } from 'vitest';
            test.each(getCases())('case %i', () => {});
          `,
        },
        {
          code: `
            import { test } from 'vitest';
            test.each(getCases() as unknown[])('case %i', () => {});
          `,
        },
        {
          code: `
            import { test } from 'vitest';
            const cases = [];
            const alias = cases;
            test.each(alias)('case %i', () => {});
          `,
        },
        {
          code: `
            import { test } from 'vitest';
            const cases = [];
            test.todo.each(cases)('case %i', () => {});
          `,
        },
        {
          code: `
            import { test } from 'vitest';
            test.each([])();
          `,
        },
        {
          code: `
            import { test } from 'vitest';
            function f() {
              const test = { each: () => () => {} };
              test.each([])('case %i', () => {});
            }
          `,
        },
        {
          code: `
            import { it } from 'mocha';
            it.each([])('case %i', () => {});
          `,
        },
        {
          code: `
            import { test } from 'vitest';
            function f() {
              const cases: number[] = [];
              return () => test.each(cases)('case %i', () => {});
            }
            f();
          `,
        },
        {
          code: `
            import { test } from 'vitest';
            const cases = [];
            populate();
            test.each(cases)('case %i', () => {});
            function populate() { cases.push([1]); }
          `,
        },
        {
          code: `
            import { test } from 'vitest';
            let body = () => {};
            body = getBody();
            test.each([])('case %i', body);
          `,
        },
        {
          code: `
            import { test } from 'vitest';
            test.each([[], []])('case %i', () => {});
          `,
        },
      ],
      invalid: [
        {
          code: `
            import { test } from 'vitest';
            test.each([] as const)('case %i', () => {});
          `,
          errors: [{ messageId }],
        },
        {
          code: `
            import { test } from 'vitest';
            test.each([] satisfies unknown[])('case %i', () => {});
          `,
          errors: [{ messageId }],
        },
        {
          code: `
            import { test } from '@jest/globals';
            function body() {}
            test.each([])('case %i', body);
          `,
          errors: [{ messageId }],
        },
        {
          code: `
            import { test } from 'vitest';
            const body = () => {};
            test.each([])('case %i', body);
          `,
          errors: [{ messageId }],
        },
        {
          code: `
            import { test } from 'bun:test';
            const body = function () {};
            test.each([])('case %i', body);
          `,
          errors: [{ messageId }],
        },
        {
          code: `
            import { describe, test } from 'bun:test';
            test.each([])('case %i', () => {});
            describe.each([])('case %i', () => {});
          `,
          errors: [{ messageId }, { messageId }],
        },
        {
          code: `
            import { test as bunTest } from 'bun:test';
            const cases = [];
            bunTest.each(cases)('case %i', () => {});
            cases.push(1);
          `,
          errors: [{ messageId }],
        },
        {
          code: `
            test.each([])('case %i', () => {});
          `,
          filename: jestFixture,
          errors: [{ messageId }],
        },
        {
          code: `
            import { test } from '@jest/globals';
            test.each([])('case %i', () => {});
          `,
          errors: [{ messageId }],
        },
        {
          code: `
            import { it } from 'vitest';
            it.each([])('case %i', () => {});
          `,
          errors: [{ messageId }],
        },
        {
          code: `
            import { describe } from 'vitest';
            describe.each([])('case %i', () => {});
          `,
          errors: [{ messageId }],
        },
        {
          code: `
            import { test as check } from '@jest/globals';
            check.failing.each([])('case %i', () => {});
          `,
          errors: [{ messageId }],
        },
        {
          code: `
            const { test } = require('@jest/globals');
            test.each([])('case %i', () => {});
          `,
          errors: [{ messageId }],
        },
        {
          code: `
            import { describe } from 'vitest';
            describe.concurrent.each([])('case %i', () => {});
            describe.sequential.each([])('case %i', () => {});
          `,
          errors: [{ messageId }, { messageId }],
        },
        {
          code: `
            import { suite } from 'vitest';
            const cases: number[] = [];
            suite.each(cases)('case %i', () => {});
            cases.push(1);
          `,
          errors: [{ messageId }],
        },
        {
          code: `
            import { test } from 'vitest';
            let cases = [];
            test.each(cases)('case %i', () => {});
            cases = [[1]];
          `,
          errors: [{ messageId }],
        },
        {
          code: `
            import { test } from 'vitest';
            {
              const cases = [];
              {
                const marker = 1;
                test.each(cases)('case %i', () => marker);
              }
            }
          `,
          errors: [{ messageId }],
        },
        {
          code: `
            import { test } from 'vitest';
            test.only.each([])('case %i', () => {});
            test.concurrent.each([])('case %i', () => {});
            test.fails.each([])('case %i', () => {});
            test.sequential.each([])('case %i', () => {});
          `,
          errors: [{ messageId }, { messageId }, { messageId }, { messageId }],
        },
      ],
    });
  });
});
