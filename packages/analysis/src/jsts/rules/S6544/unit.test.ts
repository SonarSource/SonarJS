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
import type { Rule } from 'eslint';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { RuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rules as tsEslintRules } from '../external/typescript-eslint/index.js';
import { guardNoMisusedPromisesReturnListener } from './rule.js';

const upstreamRule = tsEslintRules['no-misused-promises'];

describe('S6544 upstream sentinel', () => {
  it('upstream no-misused-promises crashes on a top-level return statement', () => {
    const ruleTester = new RuleTester({
      parserOptions: {
        sourceType: 'script',
      },
    });

    expect(() =>
      ruleTester.run('no-misused-promises-crash', upstreamRule, {
        valid: [],
        invalid: [
          {
            code: 'return Promise.resolve(42);',
            errors: 1,
          },
        ],
      }),
    ).toThrow('Non-null Assertion Failed: Expected node to have a parent.');
  });
});

describe('S6544 hardening', () => {
  it('should ignore missing parent errors from the upstream return listener', () => {
    let calls = 0;
    const listeners = guardNoMisusedPromisesReturnListener({
      ReturnStatement() {
        calls += 1;
        throw new Error('Non-null Assertion Failed: Expected node to have a parent.');
      },
    } as Rule.RuleListener);

    expect(() => listeners.ReturnStatement?.({ type: 'ReturnStatement' } as any)).not.toThrow();
    expect(calls).toBe(1);
  });

  it('should rethrow other return listener errors', () => {
    const listeners = guardNoMisusedPromisesReturnListener({
      ReturnStatement() {
        throw new Error('boom');
      },
    } as Rule.RuleListener);

    expect(() => listeners.ReturnStatement?.({ type: 'ReturnStatement' } as any)).toThrow('boom');
  });
});
