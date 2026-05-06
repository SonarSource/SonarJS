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
            import assert from 'node:assert/strict';
            import test from 'node:test';

            test('matching types', () => {
              const count: number = 1;
              const title: string = '1';
              const enabled: boolean = true;
              const startedAt: Date = new Date('2024-01-01T00:00:00.000Z');

              assert.strictEqual(count, Number(title));
              assert.strictEqual(enabled, true);
              assert.strictEqual(startedAt.getTime(), Date.parse('2024-01-01T00:00:00.000Z'));
            });
          `,
        },
        {
          code: `
            import { expect } from 'vitest';

            const value: string | number = Math.random() > 0.5 ? 'ready' : 1;
            expect(value).toBe('ready');
            expect(value).toBe(1);
          `,
        },
        {
          code: `
            import { expect } from 'vitest';

            const result: any = getResult();
            const value: unknown = getValue();
            expect(result).toBe(42);
            expect(value).toEqual('value');
          `,
        },
        {
          code: `
            import { expect } from 'vitest';

            function assertValue<T>(actual: T, expected: number) {
              expect(actual).toBe(expected);
            }
          `,
        },
        {
          code: `
            import { expect } from 'vitest';

            const user: { id: number; name: string } = { id: 1, name: 'Ada' };
            expect(user).toStrictEqual({ id: 1, name: 'Ada' });
          `,
        },
        {
          code: `
            import assert from 'node:assert';

            const count: number = 1;
            const title: string = '1';
            assert.equal(count, title);
            assert.notEqual(count, title);
          `,
        },
        {
          code: `
            import { assert } from 'chai';

            const price: number = 19.99;
            assert.equal(price, '19.99');
            assert.notEqual(price, 'free');
          `,
        },
        {
          code: `
            import { expect } from 'vitest';

            const value = getValue();
            expect(value).toBeTruthy();
          `,
        },
      ],
      invalid: [
        {
          code: `
            import { expect, test } from 'vitest';

            test('dissimilar types', () => {
              const count: number = 1;
              const title: string = '1';
              const enabled: boolean = true;

              expect(title).toBe(count);
              expect(enabled).not.toEqual('true');
            });
          `,
          errors: [{ messageId: 'alwaysFailsWithTypes' }, { messageId: 'alwaysSucceedsWithTypes' }],
        },
        {
          code: `
            import assert from 'node:assert/strict';
            import test from 'node:test';

            test('dissimilar types', () => {
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
            { messageId: 'alwaysFailsWithTypes' },
            { messageId: 'alwaysSucceedsWithTypes' },
            { messageId: 'alwaysFailsWithTypes' },
          ],
        },
        {
          code: `
            import { expect } from 'vitest';

            const id: number = 42;
            const name: string = '42';
            const score: number = 100;
            const scoreText: string = '100';

            expect(id).toEqual(name);
            expect(score).toStrictEqual(scoreText);
          `,
          errors: 2,
        },
        {
          code: `
            import { deepStrictEqual, notDeepStrictEqual } from 'node:assert';

            const port: number = 8080;
            const portText: string = '8080';
            const active: boolean = true;

            deepStrictEqual(port, portText);
            notDeepStrictEqual(active, 0);
          `,
          errors: [{ messageId: 'alwaysFailsWithTypes' }, { messageId: 'alwaysSucceedsWithTypes' }],
        },
        {
          code: `
            import { assert } from 'chai';

            const quantity: number = 3;
            const quantityText: string = '3';
            const inStock: boolean = true;

            assert.strictEqual(quantity, quantityText);
            assert.notStrictEqual(inStock, 1);
            assert.deepEqual(quantity, inStock);
            assert.notDeepEqual(inStock, 'yes');
          `,
          errors: [
            { messageId: 'alwaysFailsWithTypes' },
            { messageId: 'alwaysSucceedsWithTypes' },
            { messageId: 'alwaysFailsWithTypes' },
            { messageId: 'alwaysSucceedsWithTypes' },
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            const version: number = 2;
            const versionText: string = '2';
            const deprecated: boolean = false;

            expect(version).to.equal(versionText);
            expect(versionText).to.deep.equal(version);
            expect(deprecated).to.eql(version);
          `,
          errors: 3,
        },
        {
          code: `
            import 'chai/register-should';

            declare global {
              interface Number {
                should: {
                  equal(expected: string): void;
                  deep: { equal(expected: string): void };
                };
              }
            }

            const timeout: number = 1000;
            const timeoutText: string = '1000';
            timeout.should.equal(timeoutText);
            timeout.should.deep.equal(timeoutText);
          `,
          errors: 2,
        },
        {
          code: `
            import { expect } from 'jasmine';

            const amount: number = 10;
            const amountText: string = '10';
            const retries: number = 3;
            const retriesText: string = '3';

            expect(amount).toBe(amountText);
            expect(retries).toEqual(retriesText);
          `,
          errors: 2,
        },
        {
          code: `
            import { expect } from '@playwright/test';

            const pageTitle: string = 'Home';
            const expectedCount: number = 1;
            expect(pageTitle).toBe(expectedCount);
          `,
          errors: 1,
        },
        {
          code: `
            import 'cypress';

            declare const cy: {
              wrap<T>(value: T): {
                should(assertion: string, expected: unknown): void;
              };
            };

            const title: string = 'Home';
            const count: number = 1;
            cy.wrap(title).should('equal', count);
            cy.wrap(count).should('deep.equal', title);
          `,
          errors: 2,
        },
        {
          code: `
            import { expect } from 'vitest';

            const total: number = 1;
            const enabled: boolean = true;
            const id: bigint = 1n;

            expect(total).toBe(enabled);
            expect(id).toEqual(total);
          `,
          errors: 2,
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

            const count = 1;
            const title = '1';
            expect(title).toBe(count);
          `,
        },
      ],
      invalid: [],
    });
  });
});
