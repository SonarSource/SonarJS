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
import { RuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { rules as tsEslintRules } from '../external/typescript-eslint/index.js';
import { describe, it } from 'node:test';
import * as meta from './generated-meta.js';

const upstreamRule = tsEslintRules['no-base-to-string'];

// Sentinel: verify that the upstream ESLint rule still raises on the patterns our decorator fixes.
// If this test starts failing (i.e., the upstream rule no longer reports these patterns),
// it signals that the decorator can be safely removed.
describe('S6551 upstream sentinel', () => {
  it('upstream no-base-to-string raises on guarded toString calls that decorator suppresses', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('no-base-to-string', upstreamRule, {
      valid: [],
      invalid: [
        {
          code: `
function guardedByPrototypeComparison(value: object) {
  if (value.toString !== Object.prototype.toString) {
    return value.toString();
  }

  return undefined;
}
          `,
          errors: 1,
        },
        {
          code: `
function guardedByFunctionAndPrototypeComparison(value: object) {
  if (typeof value.toString === 'function' && value.toString !== Object.prototype.toString) {
    const rendered = value.toString();
    return rendered;
  }

  return undefined;
}
          `,
          errors: 1,
        },
        {
          code: `
function guardedByFunctionAndPrototypeComparisonReturn(value: unknown) {
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof value.toString === 'function' &&
    value.toString !== Object.prototype.toString
  ) {
    return value.toString();
  }

  return undefined;
}
          `,
          errors: 1,
        },
        {
          code: `
function rejectedDefaultStringResult(data: unknown) {
  if (data && typeof data === 'object' && typeof data.toString === 'function') {
    const rendered = data.toString();
    if (rendered !== '[object Object]') {
      return rendered;
    }
  }

  return data;
}
          `,
          errors: 1,
        },
      ],
    });
  });
});

describe('Rule S6551', () => {
  test(meta, rule, import.meta.dirname);
});
