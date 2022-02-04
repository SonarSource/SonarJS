/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import { Linter, Rule as ESLintRule, SourceCode } from 'eslint';
import { IssueLocation } from './analyzer';

const rulesWithQuickFix = new Set(['no-extra-semi', 'no-unsafe-negation']);

export interface QuickFix {
  message: string;
  edits: QuickFixEdit[];
}

interface QuickFixEdit {
  loc: IssueLocation;
  text: string;
}

export function getQuickFixes(source: SourceCode, eslintIssue: Linter.LintMessage): QuickFix[] {
  if (!hasQuickFix(eslintIssue)) {
    return [];
  }
  const quickFixes: QuickFix[] = [];
  if (eslintIssue.fix) {
    quickFixes.push({
      message: 'Fix this issue',
      edits: [fixToEdit(source, eslintIssue.fix)],
    });
  }
  if (eslintIssue.suggestions) {
    eslintIssue.suggestions.forEach(suggestion => {
      quickFixes.push({
        message: suggestion.desc,
        edits: [fixToEdit(source, suggestion.fix)],
      });
    });
  }
  return quickFixes;
}

function hasQuickFix(issue: Linter.LintMessage): boolean {
  if (!issue.fix && (!issue.suggestions || issue.suggestions.length === 0)) {
    return false;
  }
  return !!issue.ruleId && rulesWithQuickFix.has(issue.ruleId);
}

function fixToEdit(source: SourceCode, fix: ESLintRule.Fix): QuickFixEdit {
  const [start, end] = fix.range;
  const startPos = source.getLocFromIndex(start);
  const endPos = source.getLocFromIndex(end);
  return {
    loc: {
      line: startPos.line,
      column: startPos.column,
      endLine: endPos.line,
      endColumn: endPos.column,
    },
    text: fix.text,
  };
}
