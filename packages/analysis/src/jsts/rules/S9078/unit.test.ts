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
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';

describe('S9078', () => {
  it('reports duplicate rows in supported parameterized test datasets', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('Disallow duplicate parameterized test cases', rule, {
      valid: [
        {
          code: `
            import { test } from '@jest/globals';
            test.each([
              ['Alice', 'Hello, Alice!'],
              ['Bob', 'Hello, Bob!'],
              ['Carol', 'Hello, Carol!'],
            ])('greets %s', (name, expected) => expect(greet(name)).toBe(expected));
          `,
        },
        {
          code: `
            import { test } from 'vitest';
            const cases = [
              [1, 2],
              [2, 4],
            ];
            test.each(cases)('doubles %i', (value, expected) => expect(value * 2).toBe(expected));
          `,
        },
        {
          code: `
            import { test } from 'vitest';
            test.each([
              [makeUser('Alice'), 'admin'],
              [makeUser('Bob'), 'user'],
              [makeUser('Alice'), 'editor'],
            ])('handles users', (user, role) => expect(user.role).toBe(role));
          `,
        },
        {
          code: `
            import { test } from '@playwright/test';
            test.describe('users', () => {
              [
                ['Alice', 'admin'],
                ['Alice', 'admin'],
              ].forEach(([name, role]) => test(name, () => expect(role).toBeDefined()));
            });
          `,
        },
      ],
      invalid: [
        {
          code: `
            import { test } from '@jest/globals';
            test.each([
              ['Alice', 'Hello, Alice!'],
              ['Bob', 'Hello, Bob!'],
              ['Alice', 'Hello, Alice!'],
            ])('greets %s', (name, expected) => expect(greet(name)).toBe(expected));
          `,
          errors: [{ messageId: 'duplicate', data: { index: 0 } }],
        },
        {
          code: `
            import { suite } from 'vitest';
            suite.each([
              ['Alice', 'admin'],
              ['Bob', 'user'],
              ['Alice', 'admin'],
            ])('handles users', () => {});
          `,
          errors: [{ messageId: 'duplicate', data: { index: 0 } }],
        },
        {
          code: `
            import { test } from 'vitest';
            const alice = { name: 'Alice' };
            const bob = { name: 'Bob' };
            test.each([
              [alice, 'Alice'],
              [bob, 'Bob'],
              [alice, 'Alice'],
            ])('handles users', (user, expected) => expect(user.name).toBe(expected));
          `,
          errors: [{ messageId: 'duplicate', data: { index: 0 } }],
        },
        {
          code: `
            import { test } from 'vitest';
            const runCase = () => {};
            test.each([
              ['Alice', 'admin'],
              ['Bob', 'user'],
              ['Alice', 'admin'],
            ])('handles users', runCase);
          `,
          errors: [{ messageId: 'duplicate', data: { index: 0 } }],
        },
        {
          code: `
            import { test } from 'bun:test';
            test.each([
              [makeGreeting('Alice'), 'Hello, Alice!'],
              [makeGreeting('Bob'), 'Hello, Bob!'],
              [makeGreeting('Alice'), 'Hello, Alice!'],
            ])('creates greetings', (greeting, expected) => expect(greeting).toBe(expected));
          `,
          errors: [{ messageId: 'duplicate', data: { index: 0 } }],
        },
        {
          code: `
            import { test } from 'vitest';
            test.each([
              ['Alice', 'admin'],
              ['Bob', 'user'],
              ['Alice', 'admin'],
            ] as const)('handles users', () => {});
          `,
          errors: [{ messageId: 'duplicate', data: { index: 0 } }],
        },
        {
          code: `
            import { test } from 'vitest';
            test.each([
              ['Alice', 'admin'],
              ['Bob', 'user'],
              ['Alice', 'admin'],
              ['Bob', 'user'],
              ['Alice', 'admin'],
            ])('handles users', () => {});
          `,
          errors: [
            { messageId: 'duplicate', data: { index: 0 } },
            { messageId: 'duplicate', data: { index: 1 } },
            { messageId: 'duplicate', data: { index: 0 } },
          ],
        },
      ],
    });
  });
});
