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
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import {
  greatestCommonDivisor,
  isExactlyRepresentableAsBinaryFraction,
  isExactlyRepresentableIntegerDivision,
  isPowerOfTwo,
} from '../helpers/numbers.js';
import { rule } from './rule.js';

const ruleTester = new NoTypeCheckingRuleTester();

describe('number helpers', () => {
  it('checks powers of two', () => {
    assert.equal(isPowerOfTwo(0n), false);
    assert.equal(isPowerOfTwo(1n), true);
    assert.equal(isPowerOfTwo(8n), true);
    assert.equal(isPowerOfTwo(10n), false);
  });

  it('computes the greatest common divisor', () => {
    assert.equal(greatestCommonDivisor(54n, 24n), 6n);
  });

  it('checks decimal literal binary representation', () => {
    assert.equal(isExactlyRepresentableAsBinaryFraction('0.5'), true);
    assert.equal(isExactlyRepresentableAsBinaryFraction('1e15'), true);
    assert.equal(isExactlyRepresentableAsBinaryFraction('0.3'), false);
    assert.equal(isExactlyRepresentableAsBinaryFraction('not-a-number'), false);
  });

  it('checks integer division binary representation', () => {
    assert.equal(isExactlyRepresentableIntegerDivision(3, 2), true);
    assert.equal(isExactlyRepresentableIntegerDivision(10, 3), false);
    assert.equal(isExactlyRepresentableIntegerDivision(1, 0), false);
    assert.equal(isExactlyRepresentableIntegerDivision(1.5, 2), false);
  });
});

describe('S1244', () => {
  it('S1244', () => {
    ruleTester.run('Floating point numbers should not be tested for equality', rule, {
      valid: [
        { code: `count === 3;` },
        { code: `count !== 10 / 2;` },
        { code: `x === 3 / 2;` },
        { code: `x === 5 / 4;` },
        { code: `x === 7 / 8;` },
        { code: `codePoint === 0xFEFF;` },
        { code: `timestamp === 1e15;` },
        { code: `anchor === 0.5;` },
        { code: `imageWidth === CONTAINER_HEIGHT * 0.75;` },
        { code: `expectedRemainder === total % 0.5;` },
        { code: `result === expected;` },
        { code: `value < 4 || value > 5;` },
        { code: `value <= 4 && value >= 5;` },
        { code: `Math.abs(total - 0.3) < Number.EPSILON;` },
        { code: `almostEqual(total, 0.3);` },
        {
          code: `
            import { expect } from 'vitest';
            expect(serviceFee(2)).toBeCloseTo(0.3);
          `,
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert.ok(almostEqual(taxAmount(1), 1 / 12));
          `,
        },
        {
          code: `
            import { expect } from 'chai';
            expect(0.1 + 0.2).to.be.closeTo(0.3, Number.EPSILON);
          `,
        },
        {
          code: `
            function expect(value) {
              return { toBe(expected) {} };
            }
            expect(0.1 + 0.2).toBe(0.3);
          `,
        },
        {
          code: `
            const exact = 4 / 2;
            exact === 2;
          `,
        },
        {
          code: `
            let mutable = 0.1 + 0.2;
            mutable === expected;
          `,
        },
        {
          code: `
            const precision = 10 / 2;
            total === precision;
          `,
        },
        {
          code: `
            switch (count) {
              case 3:
              case 10 / 2:
                publish(count);
            }
          `,
        },
        {
          code: `
            import { expect, test } from 'vitest';
            test('computes a total', () => {
              expect(0.1 + 0.2).not.toBeCloseTo(0.4);
            });
          `,
        },
      ],
      invalid: [
        { code: `if (total === 0.3) { publish(total); }`, errors: 1 },
        { code: `if (total === +0.3) { publish(total); }`, errors: 1 },
        { code: `if (delta !== -1e-12) { publish(delta); }`, errors: 1 },
        { code: `const retryStatus = total !== 0.3 ? 'retry' : 'settled';`, errors: 1 },
        { code: `function isUnexpected() { return getRatio() != 10 / 3; }`, errors: 1 },
        { code: `const same = 0.1 + 0.2 == expected;`, errors: 1 },
        { code: `const same = amount * 0.0825 === expectedTax;`, errors: 1 },
        { code: `function isUnexpected() { return getRatio() != -10 / 3; }`, errors: 1 },
        { code: `if (average <= 1.1 && average >= 1.1) { publish(average); }`, errors: 1 },
        { code: `if (average >= 1.1 && average <= 1.1) { publish(average); }`, errors: 1 },
        { code: `if (1.1 >= average && 1.1 <= average) { publish(average); }`, errors: 1 },
        { code: `if (1.1 <= average && average <= 1.1) { publish(average); }`, errors: 1 },
        { code: `if (conversionRate < 10 / 3 || conversionRate > 10 / 3) { retry(); }`, errors: 1 },
        { code: `if (conversionRate > 10 / 3 || conversionRate < 10 / 3) { retry(); }`, errors: 1 },
        { code: `if (10 / 3 < conversionRate || conversionRate < 10 / 3) { retry(); }`, errors: 1 },
        {
          code: `
            const averageScore = (0.8 + 0.3) / 2;
            if (averageScore <= 0.55 && averageScore >= 0.55) {
              publish(averageScore);
            }
          `,
          errors: 1,
        },
        {
          code: `
            const expectedTotal = 0.1 + 0.2;
            if (actualTotal === expectedTotal) {
              publish(actualTotal);
            }
          `,
          errors: 1,
        },
        {
          code: `
            const rawTotal = 0.1 + 0.2;
            const expectedTotal = rawTotal;
            if (actualTotal === expectedTotal) {
              publish(actualTotal);
            }
          `,
          errors: 1,
        },
        {
          code: `
            import { expect, test } from 'vitest';
            test('computes a total', () => {
              expect(0.1 + 0.2).toBe(0.3);
            });
          `,
          errors: 1,
        },
        {
          code: `
            import { expect, test } from 'vitest';
            test('computes a total', () => {
              expect(0.1 + 0.2).not.toBe(0.4);
            });
          `,
          errors: 1,
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert.strictEqual(taxAmount(1), 1 / 12);
          `,
          errors: 1,
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert.notStrictEqual(taxAmount(1), 1 / 12);
          `,
          errors: 1,
        },
        {
          code: `
            import { expect as chaiExpect } from 'chai';
            chaiExpect(0.1 + 0.2).to.equal(0.3);
          `,
          errors: 1,
        },
        {
          code: `
            import { assert } from 'chai';
            assert.strictEqual(total, 0.3);
          `,
          errors: 1,
        },
        {
          code: `
            import 'cypress';
            cy.wrap(price()).should('equal', 0.3);
          `,
          errors: 1,
        },
        {
          code: `
            switch (total) {
              case 0.3:
                publish(total);
                break;
              case 1 / 3:
                retry();
                break;
            }
          `,
          errors: 2,
        },
      ],
    });
  });
});
