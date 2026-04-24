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
import { guardNoMisusedPromisesReturnListener } from './rule.js';

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
