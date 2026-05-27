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

describe('S1244', () => {
  it('reports exact comparisons on floating-point-sensitive expressions', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-floating-point-equality', rule, {
      valid: [
        {
          code: `
            const count = getCount();
            if (count === 5) {
              publish(count);
            }
          `,
        },
        {
          code: `
            const label = getLabel();
            if (label === "3.14") {
              publish(label);
            }
          `,
        },
        {
          code: `
            const actual = getRatio();
            const expected = getExpectedRatio();
            if (actual === expected) {
              publish(actual);
            }
          `,
        },
        {
          code: `
            const total = 0.1 + 0.2;
            if (Math.abs(total - 0.3) < Number.EPSILON) {
              publish(total);
            }
          `,
        },
        {
          code: `
            const count = getCount();
            if (count <= 5 && count >= 5) {
              publish(count);
            }
          `,
        },
        {
          code: `
            const value = getValue();
            const expected = getExpectedValue();
            if (value < expected || value > expected) {
              publish(value);
            }
          `,
        },
        {
          code: `
            import { expect, test } from 'vitest';

            test('uses approximate matcher', () => {
              expect(0.1 + 0.2).toBeCloseTo(0.3);
            });
          `,
        },
        {
          code: `
            import { expect, test } from 'vitest';

            test('uses integer arithmetic', () => {
              expect(2 * 3).toBe(6);
            });
          `,
        },
        {
          code: `
            import assert from 'node:assert/strict';

            assert.strictEqual(2 * 3, 6);
          `,
        },
        {
          code: `
            import { expect } from 'chai';

            expect(0.1 + 0.2).to.be.closeTo(0.3, Number.EPSILON);
            expect(2 * 3).to.equal(6);
          `,
        },
        {
          code: `
            import 'cypress';

            cy.wrap(0.1 + 0.2).should('be.closeTo', 0.3, Number.EPSILON);
          `,
        },
      ],
      invalid: [
        {
          code: `
            const total = 0.1 + 0.2;
            if (total === 0.3) {
              publish(total);
            }
          `,
          errors: 1,
        },
        {
          code: `
            const pi = getPi();
            if (pi !== 3.14159) {
              publish(pi);
            }
          `,
          errors: 1,
        },
        {
          code: `
            const speed = readSpeed();
            if (2.998e8 === speed) {
              publish(speed);
            }
          `,
          errors: 1,
        },
        {
          code: `
            if (getRatio() !== 10 / 3) {
              publish(getRatio());
            }
          `,
          errors: 1,
        },
        {
          code: `
            const status = total === 0.3 ? "done" : "retry";
          `,
          errors: 1,
        },
        {
          code: `
            const threshold = getThreshold();
            if (threshold === -0.1) {
              publish(threshold);
            }
          `,
          errors: 1,
        },
        {
          code: `
            const average = calculateAverage();
            if (average <= 1.1 && average >= 1.1) {
              publish(average);
            }
          `,
          errors: 1,
        },
        {
          code: `
            const average = calculateAverage();
            if (average < 1.1 || average > 1.1) {
              publish(average);
            }
          `,
          errors: 1,
        },
        {
          code: `
            const average = calculateAverage();
            if (1.1 >= average && 1.1 <= average) {
              publish(average);
            }
          `,
          errors: 1,
        },
        {
          code: `
            import { expect, test } from 'vitest';

            test('computes total', () => {
              expect(0.1 + 0.2).toBe(0.3);
            });
          `,
          errors: 1,
        },
        {
          code: `
            import { expect, test } from 'vitest';

            test('computes ratio', () => {
              expect(10 / 3).not.toBe(3.333);
            });
          `,
          errors: 1,
        },
        {
          code: `
            import assert from 'node:assert/strict';

            assert.strictEqual(0.1 + 0.2, 0.3);
          `,
          errors: 1,
        },
        {
          code: `
            import assert from 'node:assert/strict';

            assert.notStrictEqual(10 / 3, 3.333);
          `,
          errors: 1,
        },
        {
          code: `
            import { expect } from 'chai';

            expect(0.1 + 0.2).to.equal(0.3);
          `,
          errors: 1,
        },
        {
          code: `
            import 'cypress';

            cy.wrap(0.1 + 0.2).should('equal', 0.3);
          `,
          errors: 1,
        },
      ],
    });
  });
});
