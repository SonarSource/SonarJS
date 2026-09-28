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
import { rules } from '../external/unicorn.js';
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
const ticketOutput = `function generateHash(value: string): number {
  let hash = 0;
  for (const char of value) {
    hash = Math.trunc(Math.imul(31, hash) + char.charCodeAt(0));
  }
  return hash;
}`;

// Sentinel: an upstream fix should make this fail, prompting removal of the decorator.
describe('S7767 upstream sentinel', () => {
  it('upstream reports signed 32-bit wrapping in a hash', () => {
    new RuleTester().run('prefer-math-trunc', rules['prefer-math-trunc'], {
      valid: [],
      invalid: [{ code: ticket, output: ticketOutput, errors: [{ messageId: 'error-bitwise' }] }],
    });
  });
});

describe('S7767', () => {
  it('preserves signed 32-bit wrapping with primitive string types', () => {
    new RuleTester().run('prefer-math-trunc', rule, {
      valid: [
        { code: ticket },
        {
          code: `function hash(s: string, h: number) {
  return (s.charCodeAt(0) + Math.imul(31, h)) << 0;
}`,
        },
        {
          code: `function hash(s: string) {
  return () => ((Math.imul(31, 42) /* multiplication */ + s.charCodeAt(0))) << 0;
}`,
        },
      ],
      invalid: [
        {
          code: `function hash(s: string, h: number) { return (Math.imul(31, h) + s.charCodeAt(0) / 2) << 0; }`,
          output: `function hash(s: string, h: number) { return Math.trunc(Math.imul(31, h) + s.charCodeAt(0) / 2); }`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `const custom = { charCodeAt() { return 0.5; } }; (Math.imul(31, 42) + custom.charCodeAt(0)) << 0;`,
          output: `const custom = { charCodeAt() { return 0.5; } }; Math.trunc(Math.imul(31, 42) + custom.charCodeAt(0));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `function hash(s: any) { return (Math.imul(31, 42) + s.charCodeAt(0)) << 0; }`,
          output: `function hash(s: any) { return Math.trunc(Math.imul(31, 42) + s.charCodeAt(0)); }`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `function hash(s: unknown) { return (Math.imul(31, 42) + s.charCodeAt(0)) << 0; }`,
          output: `function hash(s: unknown) { return Math.trunc(Math.imul(31, 42) + s.charCodeAt(0)); }`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `function hash(s: string & { charCodeAt(index: number): number }) { return (Math.imul(31, 42) + s.charCodeAt(0)) << 0; }`,
          output: `function hash(s: string & { charCodeAt(index: number): number }) { return Math.trunc(Math.imul(31, 42) + s.charCodeAt(0)); }`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `function hash(s: String) { return (Math.imul(31, 42) + s.charCodeAt(0)) << 0; }`,
          output: `function hash(s: String) { return Math.trunc(Math.imul(31, 42) + s.charCodeAt(0)); }`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `function hash(Math: { imul(a: number, b: number): number }) { return (Math.imul(31, 42) + 'x'.charCodeAt(0)) << 0; }`,
          output: `function hash(Math: { imul(a: number, b: number): number }) { return Math.trunc(Math.imul(31, 42) + 'x'.charCodeAt(0)); }`,
          errors: [{ messageId: 'error-bitwise' }],
        },
      ],
    });
  });

  it('requires type information for variable string receivers', () => {
    new NoTypeCheckingRuleTester().run('prefer-math-trunc', rule, {
      valid: [{ code: `(Math.imul(31, 42) + 'x'.charCodeAt(0)) << 0;` }],
      invalid: [{ code: ticket, output: ticketOutput, errors: [{ messageId: 'error-bitwise' }] }],
    });
  });

  it('preserves literal string wrapping and retains other truncation reports', () => {
    new DefaultParserRuleTester().run('prefer-math-trunc', rule, {
      valid: [
        { code: `const hash = (Math.imul(31, 42) + 'x'.charCodeAt(0)) << 0;` },
        { code: `const hash = (Math.imul(31, 42) + ''.charCodeAt(0)) << 0;` },
      ],
      invalid: [
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
        {
          code: 'value <<= 0;',
          output: 'value = Math.trunc(value);',
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: '(Math.imul(31, hash) + 0.5) << 0;',
          output: 'Math.trunc(Math.imul(31, hash) + 0.5);',
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `(Math.imul(31, 42) + unresolved.charCodeAt(0)) << 0;`,
          output: `Math.trunc(Math.imul(31, 42) + unresolved.charCodeAt(0));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `(Math.imul(31, 42) + 'x'.charCodeAt(0)) << 0;`,
          languageOptions: { globals: { Math: 'off' } },
          output: `Math.trunc(Math.imul(31, 42) + 'x'.charCodeAt(0));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `Math = { imul: () => 0.5 }; (Math.imul(31, 42) + 'x'.charCodeAt(0)) << 0;`,
          output: `Math = { imul: () => 0.5 }; Math.trunc(Math.imul(31, 42) + 'x'.charCodeAt(0));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `const imul = Math.imul; (imul(31, 42) + 'x'.charCodeAt(0)) << 0;`,
          output: `const imul = Math.imul; Math.trunc(imul(31, 42) + 'x'.charCodeAt(0));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `const contribution = 'x'.charCodeAt(0); (Math.imul(31, 42) + contribution) << 0;`,
          output: `const contribution = 'x'.charCodeAt(0); Math.trunc(Math.imul(31, 42) + contribution);`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `(Math['imul'](31, 42) + 'x'.charCodeAt(0)) << 0;`,
          output: `Math.trunc(Math['imul'](31, 42) + 'x'.charCodeAt(0));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `(Math.imul(31, 42) + 'x'['charCodeAt'](0)) << 0;`,
          output: `Math.trunc(Math.imul(31, 42) + 'x'['charCodeAt'](0));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `(Math.imul?.(31, 42) + 'x'.charCodeAt(0)) << 0;`,
          output: `Math.trunc(Math.imul?.(31, 42) + 'x'.charCodeAt(0));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `(Math.imul(31, 42) + s?.charCodeAt(0)) << 0;`,
          output: `Math.trunc(Math.imul(31, 42) + s?.charCodeAt(0));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `(Math.imul(31) + 'x'.charCodeAt(0)) << 0;`,
          output: `Math.trunc(Math.imul(31) + 'x'.charCodeAt(0));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `(Math.imul(...args) + 'x'.charCodeAt(0)) << 0;`,
          output: `Math.trunc(Math.imul(...args) + 'x'.charCodeAt(0));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `(Math.imul(31, ...args) + 'x'.charCodeAt(0)) << 0;`,
          output: `Math.trunc(Math.imul(31, ...args) + 'x'.charCodeAt(0));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `(Math.imul(31, 42) + 'x'.charCodeAt()) << 0;`,
          output: `Math.trunc(Math.imul(31, 42) + 'x'.charCodeAt());`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `(Math.imul(31, 42) + 'x'.charCodeAt(1)) << 0;`,
          output: `Math.trunc(Math.imul(31, 42) + 'x'.charCodeAt(1));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `(Math.imul(31, 42) + 'x'.charCodeAt(0) + 0.5) << 0;`,
          output: `Math.trunc(Math.imul(31, 42) + 'x'.charCodeAt(0) + 0.5);`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `(Math.imul(31, 42) + 'x'.charCodeAt(0)) >> 0;`,
          output: `Math.trunc(Math.imul(31, 42) + 'x'.charCodeAt(0));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `~~(Math.imul(31, 42) + 'x'.charCodeAt(0));`,
          output: `Math.trunc(Math.imul(31, 42) + 'x'.charCodeAt(0));`,
          errors: [{ messageId: 'error-bitwise-not' }],
        },
        {
          code: `(Math.imul(31, 42) + null) << 0;`,
          output: `Math.trunc(Math.imul(31, 42) + null);`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `(Math.imul(31, 42) + undefined) << 0;`,
          output: `Math.trunc(Math.imul(31, 42) + undefined);`,
          errors: [{ messageId: 'error-bitwise' }],
        },
      ],
    });
  });

  it('retains reports in dynamic with scopes', () => {
    new DefaultParserRuleTester({ sourceType: 'script' }).run('prefer-math-trunc', rule, {
      valid: [],
      invalid: [
        {
          code: `with ({ Math: { imul() { return 0.5; } } }) { (Math.imul(31, 42) + 'x'.charCodeAt(0)) << 0; }`,
          output: `with ({ Math: { imul() { return 0.5; } } }) { Math.trunc(Math.imul(31, 42) + 'x'.charCodeAt(0)); }`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `with ({ Math: { imul() { return 0.5; } } }) { function hash() { return (Math.imul(31, 42) + 'x'.charCodeAt(0)) << 0; } }`,
          output: `with ({ Math: { imul() { return 0.5; } } }) { function hash() { return Math.trunc(Math.imul(31, 42) + 'x'.charCodeAt(0)); } }`,
          errors: [{ messageId: 'error-bitwise' }],
        },
      ],
    });
  });
});
