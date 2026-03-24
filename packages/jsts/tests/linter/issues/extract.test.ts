/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type { Linter } from 'eslint';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { rule as cognitiveComplexityRule } from '../../../src/linter/custom-rules/cognitive-complexity.js';
import { extractInternalMetrics } from '../../../src/linter/issues/extract.js';

const cognitiveRuleId = `sonarjs/${cognitiveComplexityRule.ruleId}`;

describe('extractInternalMetrics', () => {
  it('should extract cognitive complexity from lint messages', () => {
    const messages = [lintMessage({ ruleId: cognitiveRuleId, message: '42' })];

    expect(extractInternalMetrics(messages)).toEqual({
      messages: [],
      cognitiveComplexity: 42,
    });
  });

  it('should return undefined on invalid cognitive complexity', () => {
    const messages = [lintMessage({ ruleId: cognitiveRuleId, message: 'nan' })];

    expect(extractInternalMetrics(messages)).toEqual({
      messages: [],
      cognitiveComplexity: undefined,
    });
  });

  it('should preserve non-internal messages', () => {
    const messages = [lintMessage({ ruleId: 'sonarjs/S1116', message: 'issue message' })];

    expect(extractInternalMetrics(messages)).toEqual({
      messages,
      cognitiveComplexity: undefined,
    });
  });

  it('should extract only first internal message and preserve subsequent duplicates', () => {
    const duplicateCognitive = lintMessage({ ruleId: cognitiveRuleId, message: '43' });
    const messages = [lintMessage({ ruleId: cognitiveRuleId, message: '42' }), duplicateCognitive];

    expect(extractInternalMetrics(messages)).toEqual({
      messages: [duplicateCognitive],
      cognitiveComplexity: 42,
    });
  });
});

function lintMessage({ ruleId, message }: { ruleId: string; message: string }): Linter.LintMessage {
  return {
    ruleId,
    message,
    line: 1,
    column: 1,
    severity: 2,
  };
}
