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
import { rules as externalRules } from '../external/unicorn.js';
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';
import type { Rule } from 'eslint';

const upstreamRule = externalRules['prefer-math-trunc'] as Rule.RuleModule;

/**
 * Sentinel: the decorator only exists because upstream suggests `Math.trunc` for coercions it
 * cannot replace. Should upstream start accepting these, this test fails and the decorator,
 * together with its tests, should be deleted.
 */
describe('S7767 upstream sentinel', () => {
  it('raw upstream still reports deliberate signed 32-bit wrapping', () => {
    new DefaultParserRuleTester().run('Raw unicorn rule', upstreamRule, {
      valid: [],
      invalid: [
        {
          code: `(Math.imul(31, hash) + s.charCodeAt(i)) << 0;`,
          output: `Math.trunc(Math.imul(31, hash) + s.charCodeAt(i));`,
          errors: [{ messageId: 'error-bitwise' }],
        },
        {
          code: `(Math.imul(31, hash) + s.charCodeAt(i)) | 0;`,
          errors: [
            {
              messageId: 'error-bitwise',
              suggestions: [
                {
                  messageId: 'suggestion-bitwise',
                  data: { operator: '|', value: '0' },
                  output: `Math.trunc(Math.imul(31, hash) + s.charCodeAt(i));`,
                },
              ],
            },
          ],
        },
        {
          code: `~~(Math.imul(31, hash) + s.charCodeAt(i));`,
          output: `Math.trunc(Math.imul(31, hash) + s.charCodeAt(i));`,
          errors: [{ messageId: 'error-bitwise-not' }],
        },
      ],
    });
  });
});
