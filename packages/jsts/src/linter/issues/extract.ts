/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { Issue } from './issue.js';
import { rule as cognitiveComplexityRule } from '../custom-rules/cognitive-complexity.js';
import { rule as symbolHighlightingRule } from '../custom-rules/symbol-highlighting.js';
import { SymbolHighlight } from '../visitors/symbol-highlighting.js';

/**
 * Extracts the symbol highlighting
 *
 * The linter enables the internal custom rule for symbol highlighting
 * which eventually creates an issue to this end. The issue encodes the
 * symbol highlighting as a serialized JSON object in its message, which
 * can safely be extracted if it exists in the list of returned issues
 * after linting.
 *
 * @param issues the issues to process
 * @returns the symbol highlighting
 */
export function extractHighlightedSymbols(issues: Issue[]) {
  const issue = findAndRemoveFirstIssue(issues, symbolHighlightingRule.ruleId);
  if (issue) {
    return JSON.parse(issue.message) as SymbolHighlight[];
  }
  return [];
}

/**
 * Extracts the cognitive complexity
 *
 * The linter enables the internal custom rule for cognitive complexity
 * which eventually creates an issue to this end. The issue encodes the
 * complexity as a number in its message, which can safely be extracted
 * if it exists in the list of returned issues after linting.
 *
 * @param issues the issues to process
 * @returns the cognitive complexity
 */
export function extractCognitiveComplexity(issues: Issue[]) {
  const issue = findAndRemoveFirstIssue(issues, cognitiveComplexityRule.ruleId);
  if (issue && !Number.isNaN(Number(issue.message))) {
    return Number(issue.message);
  }
  return undefined;
}

/**
 * Finds the first issue matching a rule id
 *
 * The function removes the issue from the list if it exists.
 *
 * @param issues the issues to process
 * @param ruleId the rule id that is looked for
 * @returns the found issue, if any
 */
function findAndRemoveFirstIssue(issues: Issue[], ruleId: string) {
  for (const issue of issues) {
    if (issue.ruleId === ruleId) {
      const index = issues.indexOf(issue);
      issues.splice(index, 1);
      return issue;
    }
  }
  return undefined;
}
