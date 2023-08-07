/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import {
  extractCognitiveComplexity,
  extractHighlightedSymbols,
  Issue,
} from '@sonar/jsts/linter/issues';
import { rule as cognitiveComplexityRule } from '@sonar/jsts/linter/custom-rules/cognitive-complexity';
import { rule as symbolHighlightingRule } from '@sonar/jsts/linter/custom-rules/symbol-highlighting';

describe('extract', () => {
  it('should extract highlighted symbols', () => {
    const issues: Issue[] = [
      {
        ruleId: symbolHighlightingRule.ruleId,
        line: 1,
        column: 2,
        message: JSON.stringify({
          declaration: { startLine: 1, startCol: 2, endLine: 3, endCol: 4 },
          references: [{ startLine: 10, startCol: 20, endLine: 30, endCol: 40 }],
        }),
        secondaryLocations: [],
      },
    ];
    expect(extractHighlightedSymbols(issues)).toEqual({
      declaration: { startLine: 1, startCol: 2, endLine: 3, endCol: 4 },
      references: [{ startLine: 10, startCol: 20, endLine: 30, endCol: 40 }],
    });
  });

  it('should return an empty array of highlighted symbols', () => {
    expect(extractHighlightedSymbols([])).toEqual([]);
  });

  it('should extract cognitive complexity', () => {
    const issues: Issue[] = [
      {
        ruleId: cognitiveComplexityRule.ruleId,
        line: 1,
        column: 2,
        message: '42',
        secondaryLocations: [],
      },
    ];
    expect(extractCognitiveComplexity(issues)).toEqual(42);
  });

  it('should return undefined on NaN cognitive complexity', () => {
    const issues: Issue[] = [
      {
        ruleId: cognitiveComplexityRule.ruleId,
        line: 1,
        column: 2,
        message: 'nan',
        secondaryLocations: [],
      },
    ];
    expect(extractCognitiveComplexity(issues)).toEqual(undefined);
  });

  it('should return undefined on missing cognitive complexity', () => {
    expect(extractCognitiveComplexity([])).toEqual(undefined);
  });

  it('should preserve non-extracted issues', () => {
    const issues: Issue[] = [
      {
        ruleId: symbolHighlightingRule.ruleId,
        line: 1,
        column: 2,
        message: JSON.stringify({
          declaration: { startLine: 1, startCol: 2, endLine: 3, endCol: 4 },
          references: [{ startLine: 10, startCol: 20, endLine: 30, endCol: 40 }],
        }),
        secondaryLocations: [],
      },
      {
        ruleId: 'non-extracted-rule',
        line: 1,
        column: 2,
        message: 'non-extract-message',
        secondaryLocations: [],
      },
      {
        ruleId: cognitiveComplexityRule.ruleId,
        line: 1,
        column: 2,
        message: '42',
        secondaryLocations: [],
      },
    ];
    extractHighlightedSymbols(issues);
    extractCognitiveComplexity(issues);
    expect(issues).toEqual([
      {
        ruleId: 'non-extracted-rule',
        line: 1,
        column: 2,
        message: 'non-extract-message',
        secondaryLocations: [],
      },
    ]);
  });
});
