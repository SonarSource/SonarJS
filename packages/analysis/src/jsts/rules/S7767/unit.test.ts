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
        { code: `hash = ((Math.imul(31, hash) as number) + s.charCodeAt(i)) << 0;` },
        { code: `hash = (Math.imul(31, hash)! + s.charCodeAt(i)) << 0;` },
        { code: `hash = ((Math.imul(31, hash) + s.charCodeAt(i)) as number) << 0;` },
        { code: `hash = ((Math.imul(31, hash) + s.charCodeAt(i))!) << 0;` },
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

  it('preserves every int32 coercion that updates a hash accumulator', () => {
    new DefaultParserRuleTester().run('prefer-math-trunc', rule, {
      valid: [
        { code: `hash = (Math.imul(31, hash) + s.charCodeAt(i)) << 0;` },
        { code: `hash = (Math.imul(31, hash) + s.charCodeAt(i)) >> 0;` },
        { code: `hash = (Math.imul(31, hash) + s.charCodeAt(i)) | 0;` },
        { code: `hash = (Math.imul(31, hash) + s.charCodeAt(i)) ^ 0;` },
        { code: `hash = ~~(Math.imul(31, hash) + s.charCodeAt(i));` },
        // The imul result may sit on either side, and may be combined with anything.
        { code: `hash = (s.charCodeAt(i) + Math.imul(31, hash)) << 0;` },
        { code: `hash = (Math.imul(31, hash) + s.charCodeAt(i) + seed) << 0;` },
        { code: `hash = (Math.imul(31, hash) - s.charCodeAt(i) * 2) << 0;` },
        { code: `hash = (Math.imul(31, hash) * 2) << 0;` },
        { code: `hash = (Math.imul(31, hash) / 2) << 0;` },
        { code: `hash = (Math.imul(31, hash) % 7) << 0;` },
        { code: `hash = (Math.imul(31, hash) ** 2) << 0;` },
        // `>>>` yields a uint32, which the coercion wraps back into the signed range.
        { code: `hash = (Math.imul(31, hash) >>> 0) << 0;` },
        // Negating -2^31 leaves the signed range just as an overflowing addition does.
        { code: `hash = (-Math.imul(31, hash)) << 0;` },
        // `Math.imul?.()` is still the global `Math.imul`.
        { code: `hash = (Math.imul?.(31, hash) + s.charCodeAt(i)) << 0;` },
        // Only the outermost operator has to overflow; below it, anything may carry the imul.
        { code: `hash = ((Math.imul(31, hash) ^ seed) + s.charCodeAt(i)) << 0;` },
        // Overflow is not the only divergence: `NaN << 0` is 0, `Math.trunc(NaN)` is NaN.
        { code: `hash = (Math.imul(31, hash) + ''.charCodeAt(0)) << 0;` },
        { code: `hash = (-Math.imul(31, hash) + s.charCodeAt(i)) << 0;` },
        { code: `hash = (Math['imul'](31, hash) + s.charCodeAt(i)) << 0;` },
        { code: `hash = ((Math.imul(31, hash) /* wraps */ + s.charCodeAt(i))) << 0;` },
        { code: `const h = () => { hash = (Math.imul(31, hash) + s.charCodeAt(i)) << 0; };` },
        { code: `const imul = Math.imul; hash = (imul(31, hash) + s.charCodeAt(i)) << 0;` },
        // The accumulator may be read anywhere inside the imul arguments.
        { code: `hash = (Math.imul(31, hash ^ (hash >>> 16)) + s.charCodeAt(i)) << 0;` },
        { code: `hash = (Math.imul(hash, 31) + s.charCodeAt(i)) << 0;` },
        // A property accumulator is recognised by how the chain is spelled.
        { code: `this.hash = (Math.imul(31, this.hash) + s.charCodeAt(i)) << 0;` },
        { code: `state.hash = (Math.imul(31, state.hash) + s.charCodeAt(i)) << 0;` },
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
          code: 'hash = Math.imul(31, hash) << 0;',
          output: 'hash = Math.trunc(Math.imul(31, hash));',
          errors: [{ messageId: 'error-bitwise' }],
        },
        // A bitwise operator already yields an int32, so wrapping its result stays redundant.
        {
          code: `hash = (Math.imul(31, hash) ^ s.codePointAt(i)) << 0;`,
          output: `hash = Math.trunc(Math.imul(31, hash) ^ s.codePointAt(i));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `hash = (Math.imul(31, hash) & 0xff) << 0;`,
          output: `hash = Math.trunc(Math.imul(31, hash) & 0xff);`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `hash = (Math.imul(31, hash) | s.charCodeAt(i)) << 0;`,
          output: `hash = Math.trunc(Math.imul(31, hash) | s.charCodeAt(i));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `hash = (Math.imul(31, hash) << 5) << 0;`,
          output: `hash = Math.trunc(Math.imul(31, hash) << 5);`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `hash = (Math.imul(31, hash) >> 5) << 0;`,
          output: `hash = Math.trunc(Math.imul(31, hash) >> 5);`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        // `~` re-normalises to an int32 and `+` passes the int32 through, so both stay redundant.
        {
          code: `hash = (~Math.imul(31, hash)) << 0;`,
          output: `hash = Math.trunc(~Math.imul(31, hash));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `hash = (+Math.imul(31, hash)) << 0;`,
          output: `hash = Math.trunc(+Math.imul(31, hash));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        // The imul result must reach the coercion through arithmetic.
        {
          code: `hash = (flag ? Math.imul(31, hash) : 0) << 0;`,
          output: `hash = Math.trunc(flag ? Math.imul(31, hash) : 0);`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        // Without a write back to the accumulator, nothing shows the wrap is deliberate.
        {
          code: `(Math.imul(31, hash) + s.charCodeAt(i)) << 0;`,
          output: `Math.trunc(Math.imul(31, hash) + s.charCodeAt(i));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `const h = (Math.imul(31, hash) + s.charCodeAt(i)) << 0;`,
          output: `const h = Math.trunc(Math.imul(31, hash) + s.charCodeAt(i));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `function h() { return (Math.imul(31, hash) + s.charCodeAt(i)) << 0; }`,
          output: `function h() { return Math.trunc(Math.imul(31, hash) + s.charCodeAt(i)); }`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        // A compound assignment accumulates something else on top, so it is no plain write back.
        {
          code: `total += (Math.imul(31, hash) + s.charCodeAt(i)) << 0;`,
          output: `total += Math.trunc(Math.imul(31, hash) + s.charCodeAt(i));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        // A destructuring target is not an accumulator either.
        {
          code: `[h] = (Math.imul(31, hash) + s.charCodeAt(i)) << 0;`,
          output: `[h] = Math.trunc(Math.imul(31, hash) + s.charCodeAt(i));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        // The imul must read the very binding the coercion writes.
        {
          code: `total = (Math.imul(31, hash) + s.charCodeAt(i)) << 0;`,
          output: `total = Math.trunc(Math.imul(31, hash) + s.charCodeAt(i));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `hash = (Math.imul(31, seed) + hash) << 0;`,
          output: `hash = Math.trunc(Math.imul(31, seed) + hash);`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `this.hash = (Math.imul(31, that.hash) + s.charCodeAt(i)) << 0;`,
          output: `this.hash = Math.trunc(Math.imul(31, that.hash) + s.charCodeAt(i));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        // An inner `hash` shadowing the assigned one is a different binding, name notwithstanding.
        {
          code: `let hash = 0; hash = (Math.imul(31, (hash => hash)(5)) + c) << 0;`,
          output: `let hash = 0; hash = Math.trunc(Math.imul(31, (hash => hash)(5)) + c);`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        // The callee is not the global `Math.imul`.
        {
          code: `function hash(Math, h, c) { return (Math.imul(31, h) + c) << 0; }`,
          output: `function hash(Math, h, c) { return Math.trunc(Math.imul(31, h) + c); }`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `hash = (Math.round(1.5) + s.charCodeAt(i)) << 0;`,
          output: `hash = Math.trunc(Math.round(1.5) + s.charCodeAt(i));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `hash = (helpers.imul(31, hash) + s.charCodeAt(i)) << 0;`,
          output: `hash = Math.trunc(helpers.imul(31, hash) + s.charCodeAt(i));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        // A local `Math` gives no int32 guarantee, however its name resolves.
        {
          code: `const Math = require('Math'); hash = (Math.imul(31, hash) + c) << 0;`,
          output: `const Math = require('Math'); hash = Math.trunc(Math.imul(31, hash) + c);`,
          errors: [{ messageId: 'error-bitwise' }],
        },
      ],
    });
  });
});
