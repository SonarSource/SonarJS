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
  it('reports exact comparisons on floating-point-sensitive values', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-floating-point-equality', rule, {
      valid: [
        {
          code: `
            if (count === 5) {
              publish(count);
            }
          `,
        },
        {
          code: `
            if (items !== 6) {
              retry();
            }
          `,
        },
        {
          code: `
            if (label === "3.14") {
              publish(label);
            }
          `,
        },
        {
          code: `
            if (a === b) {
              publish(a);
            }
          `,
        },
        {
          code: `
            if (count === 1e3) {
              publish(count);
            }
          `,
        },
        {
          code: `
            if (Math.abs(total - 0.3) < Number.EPSILON) {
              publish(total);
            }
          `,
        },
        {
          code: `
            if (x <= 5 && x >= 5) {
              publish(x);
            }
          `,
        },
        {
          code: `
            if (a >= b && a <= b) {
              publish(a);
            }
          `,
        },
        {
          code: `
            if (x < 5 || x > 5) {
              publish(x);
            }
          `,
        },
        {
          code: `
            if (x === someFunc()) {
              publish(x);
            }
          `,
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(0.1 + 0.2).toBeCloseTo(0.3);
          `,
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(2 * 3).toBe(6);
          `,
        },
        {
          code: `
            import assert from 'node:assert';
            assert.strictEqual(2 * 3, 6);
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
            import { expect } from 'chai';
            expect(2 * 3).to.equal(6);
          `,
        },
        {
          code: `
            import { assert } from 'chai';
            assert.equal(2 * 3, 6);
          `,
        },
        {
          code: `
            import 'chai/register-should';
            (2 * 3).should.equal(6);
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
            if (pi !== 3.14159) {
              publish(pi);
            }
          `,
          errors: 1,
        },
        {
          code: `
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
            if (offset === -0.1) {
              publish(offset);
            }
          `,
          errors: 1,
        },
        {
          code: `
            if (ratio === 1e-3) {
              publish(ratio);
            }
          `,
          errors: 1,
        },
        {
          code: `
            if ((1e-3 + tolerance) === expected) {
              publish(expected);
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
            if (total <= 11.1098 && total >= 11.1098) {
              publish(total);
            }
          `,
          errors: 1,
        },
        {
          code: `
            if (11.1098 >= total && 11.1098 <= total) {
              publish(total);
            }
          `,
          errors: 1,
        },
        {
          code: `
            if (total < 2.381e2 || total > 2.381e2) {
              publish(total);
            }
          `,
          errors: 1,
        },
        {
          code: `
            if (2.381e2 > total || 2.381e2 < total) {
              publish(total);
            }
          `,
          errors: 1,
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(0.1 + 0.2).toBe(0.3);
          `,
          errors: 1,
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(10 / 3).toBe(3.333);
          `,
          errors: 1,
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(0.1 + 0.2).not.toBe(0.3);
          `,
          errors: 1,
        },
        {
          code: `
            import assert from 'node:assert';
            assert.strictEqual(0.1 + 0.2, 0.3);
          `,
          errors: 1,
        },
        {
          code: `
            import assert from 'node:assert';
            assert.strictEqual(10 / 3, 3.333);
          `,
          errors: 1,
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert.notStrictEqual(0.1 + 0.2, 0.3);
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
            import { expect } from 'chai';
            expect(0.1 + 0.2).not.to.equal(0.3);
          `,
          errors: 1,
        },
        {
          code: `
            import { expect } from 'chai';
            expect(10 / 3).to.equal(3.333);
          `,
          errors: 1,
        },
        {
          code: `
            import { assert } from 'chai';
            assert.equal(0.1 + 0.2, 0.3);
          `,
          errors: 1,
        },
        {
          code: `
            import { assert } from 'chai';
            assert.notEqual(0.1 + 0.2, 0.3);
          `,
          errors: 1,
        },
        {
          code: `
            import 'chai/register-should';
            (0.1 + 0.2).should.equal(0.3);
          `,
          errors: 1,
        },
      ],
    });
  });
});
