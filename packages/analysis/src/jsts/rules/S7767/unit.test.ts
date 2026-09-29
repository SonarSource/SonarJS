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
import { rule } from './index.js';
import {
  DefaultParserRuleTester,
  NoTypeCheckingRuleTester,
  RuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

const ticket = `function generateHash(value: string): number {
  let hash = 0;
  for (const char of value) {
    hash = (Math.imul(31, hash) + char.charCodeAt(0)) << 0;
  }
  return hash;
}`;

const indexedHash = `function generateHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  return hash;
}`;

describe('S7767', () => {
  it('preserves signed 32-bit wrapping with type information', () => {
    new RuleTester().run('prefer-math-trunc', rule, {
      valid: [
        { code: ticket },
        { code: indexedHash },
        // A TypeScript wrapper around the imul, or around the whole coerced expression.
        { code: `((Math.imul(31, hash) as number) + s.charCodeAt(i)) << 0;` },
        { code: `(Math.imul(31, hash)! + s.charCodeAt(i)) << 0;` },
        { code: `((Math.imul(31, hash) + s.charCodeAt(i)) as number) << 0;` },
        { code: `((Math.imul(31, hash) + s.charCodeAt(i))!) << 0;` },
      ],
      invalid: [],
    });
  });

  it('preserves signed 32-bit wrapping without type information', () => {
    new NoTypeCheckingRuleTester().run('prefer-math-trunc', rule, {
      valid: [{ code: ticket }, { code: indexedHash }],
      invalid: [],
    });
  });

  it('preserves every int32 coercion around imul arithmetic', () => {
    new DefaultParserRuleTester().run('prefer-math-trunc', rule, {
      valid: [
        { code: `(Math.imul(31, hash) + s.charCodeAt(i)) << 0;` },
        { code: `(Math.imul(31, hash) + s.charCodeAt(i)) >> 0;` },
        { code: `(Math.imul(31, hash) + s.charCodeAt(i)) | 0;` },
        { code: `(Math.imul(31, hash) + s.charCodeAt(i)) ^ 0;` },
        { code: `~~(Math.imul(31, hash) + s.charCodeAt(i));` },
        // The imul result may sit on either side, and may be combined with anything.
        { code: `(s.charCodeAt(i) + Math.imul(31, hash)) << 0;` },
        { code: `(Math.imul(31, hash) + s.charCodeAt(i) + seed) << 0;` },
        { code: `(Math.imul(31, hash) - s.charCodeAt(i) * 2) << 0;` },
        { code: `(Math.imul(31, hash) * 2) << 0;` },
        { code: `(Math.imul(31, hash) / 2) << 0;` },
        { code: `(Math.imul(31, hash) % 7) << 0;` },
        { code: `(Math.imul(31, hash) ** 2) << 0;` },
        // `>>>` yields a uint32, which the coercion wraps back into the signed range.
        { code: `(Math.imul(31, hash) >>> 0) << 0;` },
        // Negating -2^31 leaves the signed range just as an overflowing addition does.
        { code: `(-Math.imul(31, hash)) << 0;` },
        // `Math.imul?.()` is still the global `Math.imul`.
        { code: `(Math.imul?.(31, hash) + s.charCodeAt(i)) << 0;` },
        // Only the outermost operator has to overflow; below it, anything may carry the imul.
        { code: `((Math.imul(31, hash) ^ seed) + s.charCodeAt(i)) << 0;` },
        // Overflow is not the only divergence: `NaN << 0` is 0, `Math.trunc(NaN)` is NaN.
        { code: `(Math.imul(31, hash) + ''.charCodeAt(0)) << 0;` },
        { code: `(-Math.imul(31, hash) + s.charCodeAt(i)) << 0;` },
        { code: `(Math['imul'](31, hash) + s.charCodeAt(i)) << 0;` },
        { code: `((Math.imul(31, hash) /* wraps */ + s.charCodeAt(i))) << 0;` },
        { code: `const hash = () => (Math.imul(31, h) + s.charCodeAt(i)) << 0;` },
        { code: `const imul = Math.imul; (imul(31, hash) + s.charCodeAt(i)) << 0;` },
      ],
      invalid: [
        // Plain truncation, untouched by the decorator.
        {
          code: 'value << 0;',
          output: 'Math.trunc(value);',
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: 'value >> 0;',
          output: 'Math.trunc(value);',
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: 'value ^ 0;',
          output: 'Math.trunc(value);',
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: 'value | 0;',
          errors: [
            {
              messageId: 'error-bitwise',
              suggestions: [
                {
                  messageId: 'suggestion-bitwise',
                  data: { operator: '|', value: '0' },
                  output: 'Math.trunc(value);',
                },
              ],
            },
          ],
        },
        {
          code: '~~value;',
          output: 'Math.trunc(value);',
          errors: [{ messageId: 'error-bitwise-not' }],
        },
        // A compound assignment coerces an assignment target, never arithmetic.
        {
          code: 'hash <<= 0;',
          output: 'hash = Math.trunc(hash);',
          errors: [{ messageId: 'error-bitwise' }],
        },
        // `Math.imul` already returns an int32, so coercing it alone really is redundant.
        {
          code: 'Math.imul(31, hash) << 0;',
          output: 'Math.trunc(Math.imul(31, hash));',
          errors: [{ messageId: 'error-bitwise' }],
        },
        // A bitwise operator already yields an int32, so wrapping its result stays redundant.
        {
          code: `(Math.imul(31, hash) ^ s.codePointAt(i)) << 0;`,
          output: `Math.trunc(Math.imul(31, hash) ^ s.codePointAt(i));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `(Math.imul(31, hash) & 0xff) << 0;`,
          output: `Math.trunc(Math.imul(31, hash) & 0xff);`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `(Math.imul(31, hash) | s.charCodeAt(i)) << 0;`,
          output: `Math.trunc(Math.imul(31, hash) | s.charCodeAt(i));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `(Math.imul(31, hash) << 5) << 0;`,
          output: `Math.trunc(Math.imul(31, hash) << 5);`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `(Math.imul(31, hash) >> 5) << 0;`,
          output: `Math.trunc(Math.imul(31, hash) >> 5);`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        // `~` re-normalises to an int32 and `+` passes the int32 through, so both stay redundant.
        {
          code: `(~Math.imul(31, hash)) << 0;`,
          output: `Math.trunc(~Math.imul(31, hash));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `(+Math.imul(31, hash)) << 0;`,
          output: `Math.trunc(+Math.imul(31, hash));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        // The imul result must reach the coercion through arithmetic.
        {
          code: `(flag ? Math.imul(31, hash) : 0) << 0;`,
          output: `Math.trunc(flag ? Math.imul(31, hash) : 0);`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        // The callee is not the global `Math.imul`.
        {
          code: `function hash(Math, h, c) { return (Math.imul(31, h) + c) << 0; }`,
          output: `function hash(Math, h, c) { return Math.trunc(Math.imul(31, h) + c); }`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `(Math.round(1.5) + s.charCodeAt(i)) << 0;`,
          output: `Math.trunc(Math.round(1.5) + s.charCodeAt(i));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `(helpers.imul(31, hash) + s.charCodeAt(i)) << 0;`,
          output: `Math.trunc(helpers.imul(31, hash) + s.charCodeAt(i));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
      ],
    });
  });
});
