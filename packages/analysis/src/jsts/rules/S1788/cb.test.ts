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
import { test } from '../../../../tests/jsts/tools/testers/comment-based/checker.js';
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { rules as tsEslintRules } from '../external/typescript-eslint/index.js';
import { describe, it } from 'node:test';
import * as meta from './generated-meta.js';

const upstreamRule = tsEslintRules['default-param-last'];

// Sentinel: verify that the upstream ESLint rule still raises on the patterns our decorator fixes.
// If this test starts failing (i.e., the upstream rule no longer reports these patterns),
// it signals that the decorator can be safely removed.
describe('S1788 upstream sentinel', () => {
  it('upstream default-param-last raises on destructured action patterns that decorator suppresses', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('default-param-last', upstreamRule, {
      valid: [],
      invalid: [
        // (state = x, { type }) — suppressed by decorator, raised by upstream
        { code: `function appReducer(state = initialState, { type }) {}`, errors: 1 },
        // (state = x, { type, payload }) — suppressed by decorator, raised by upstream
        { code: `const dataReducer = (state = null, { type, payload }) => {};`, errors: 1 },
      ],
    });
  });
});

describe('Rule S1788', () => {
  test(meta, rule, import.meta.dirname);
});
