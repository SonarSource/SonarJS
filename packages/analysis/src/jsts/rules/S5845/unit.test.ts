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
import {
  NoTypeCheckingRuleTester,
  RuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';

describe('S5845', () => {
  it('reports assertions comparing incompatible types', () => {
    const ruleTester = new RuleTester();

    ruleTester.run('no-incompatible-assertion-types', rule, {
      valid: [
        {
          code: `
            import { expect, test } from 'vitest';

            test('matching types', () => {
              const count: number = 1;
              const title: string = '1';
              const enabled: boolean = true;

              expect(title).toBe(String(count));
              expect(enabled).toEqual(true);
            });
          `,
        },
        {
          code: `
            import { expect } from 'vitest';

            const count = 42;
            const title = 'ready';
            expect(count).toBe(42);
            expect(title).toBe('other');
          `,
        },
        {
          code: `
            import { expect } from 'vitest';

            const value: string | number = Math.random() > 0.5 ? 'hello' : 42;
            expect(value).toBe(42);
            expect(value).toBe('hello');
          `,
        },
        {
          code: `
            import { expect } from 'vitest';

            const result: any = readValue();
            const value: unknown = readValue();
            expect(result).toBe(42);
            expect(value).toEqual('ready');
          `,
        },
        {
          code: `
            import { expect } from 'vitest';

            function same<T>(actual: T, expected: number) {
              expect(actual).toBe(expected);
            }
          `,
        },
        {
          code: `
            import { expect } from 'vitest';

            const user = { id: 1, name: 'Alice' };
            expect(user).toStrictEqual({ id: 1, name: 'Alice' });
          `,
        },
        {
          code: `
            import assert from 'node:assert';

            const count = 1;
            const title = '1';
            assert.equal(count, title);
            assert.notEqual(count, title);
          `,
        },
        {
          code: `
            import { assert } from 'chai';

            const price = 19.99;
            assert.equal(price, '19.99');
          `,
        },
        {
          code: `
            import { expect } from 'vitest';

            const value = 1;
            expect(value).toBeTruthy();
          `,
        },
      ],
      invalid: [
        {
          code: `
            import { expect, test } from 'vitest';

            test('assertions on dissimilar types', () => {
              const count: number = 1;
              const title: string = '1';
              const enabled: boolean = true;

              expect(title).toBe(count);
              expect(enabled).not.toEqual('true');
            });
          `,
          errors: [{ messageId: 'issueWithTypes' }, { messageId: 'issueWithTypes' }],
        },
        {
          code: `
            import assert from 'node:assert/strict';
            import test from 'node:test';

            test('assertions on dissimilar types', () => {
              const count: number = 1;
              const title: string = '1';
              const enabled: boolean = true;
              const startedAt: Date = new Date();

              assert.strictEqual(count, title);
              assert.notStrictEqual(enabled, 1);
              assert.strictEqual(startedAt, 1);
            });
          `,
          errors: [
            { messageId: 'issueWithTypes' },
            { messageId: 'issueWithTypes' },
            { messageId: 'issueWithTypes' },
          ],
        },
        {
          code: `
            import { expect } from 'vitest';

            const id: number = 123;
            const name: string = '123';
            const score: number = 10;
            const scoreText: string = '10';

            expect(id).toEqual(name);
            expect(score).toStrictEqual(scoreText);
          `,
          errors: [{ messageId: 'issueWithTypes' }, { messageId: 'issueWithTypes' }],
        },
        {
          code: `
            import assert from 'node:assert';

            const port: number = 8080;
            const portText: string = '8080';
            const active: boolean = true;

            assert.deepStrictEqual(port, portText);
            assert.notDeepStrictEqual(active, 0);
          `,
          errors: [{ messageId: 'issueWithTypes' }, { messageId: 'issueWithTypes' }],
        },
        {
          code: `
            import { assert } from 'chai';

            const quantity: number = 2;
            const quantityText: string = '2';
            const inStock: boolean = true;

            assert.strictEqual(quantity, quantityText);
            assert.notStrictEqual(inStock, 1);
            assert.deepEqual(quantity, inStock);
          `,
          errors: [
            { messageId: 'issueWithTypes' },
            { messageId: 'issueWithTypes' },
            { messageId: 'issueWithTypes' },
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            const version: number = 3;
            const versionText: string = '3';
            const deprecated: boolean = false;

            expect(version).to.equal(versionText);
            expect(versionText).to.deep.equal(version);
            expect(deprecated).to.eql(version);
          `,
          errors: [
            { messageId: 'issueWithTypes' },
            { messageId: 'issueWithTypes' },
            { messageId: 'issueWithTypes' },
          ],
        },
        {
          code: `
            import 'chai/register-should';

            const timeout: number = 1000;
            const timeoutText: string = '1000';

            timeout.should.equal(timeoutText);
            timeoutText.should.deep.equal(timeout);
          `,
          errors: [{ messageId: 'issueWithTypes' }, { messageId: 'issueWithTypes' }],
        },
        {
          code: `
            import { expect } from '@playwright/test';

            const pageTitle: string = 'Home';
            const expectedCount: number = 1;
            expect(pageTitle).toBe(expectedCount);
          `,
          errors: [{ messageId: 'issueWithTypes' }],
        },
        {
          code: `
            import 'cypress';

            const id: number = 1;
            const idText: string = '1';
            cy.wrap(id).should('equal', idText);
            cy.wrap(idText).should('deep.equal', id);
          `,
          errors: [{ messageId: 'issueWithTypes' }, { messageId: 'issueWithTypes' }],
        },
      ],
    });
  });

  it('does not report without type information', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-incompatible-assertion-types', rule, {
      valid: [
        {
          code: `
            import { expect } from 'vitest';

            const count: number = 1;
            const title: string = '1';
            expect(title).toBe(count);
          `,
        },
      ],
      invalid: [],
    });
  });
});
