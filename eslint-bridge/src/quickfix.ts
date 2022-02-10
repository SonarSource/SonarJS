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

const quickFixRules = new Set([
  'comma-dangle',
  'eol-last',
  'no-extra-semi',
  'no-trailing-spaces',
  'no-unsafe-negation',
  'no-var',
  'object-shorthand',
  'prefer-const',
  'prefer-template',
  'quotes',
  'radix',
  'semi',
  'sonarjs/prefer-immediate-return',
  'sonarjs/prefer-while',
  '@typescript-eslint/no-empty-interface',
  '@typescript-eslint/no-explicit-any',
  '@typescript-eslint/no-inferrable-types',
  '@typescript-eslint/no-unnecessary-type-arguments',
  '@typescript-eslint/no-unnecessary-type-assertion',
  '@typescript-eslint/prefer-namespace-keyword',
  '@typescript-eslint/prefer-readonly',
  '@typescript-eslint/no-non-null-assertion',
]);

const quickFixMessages = new Map<string, string>([
  ['comma-dangle', 'Remove this trailing comma'],
  ['eol-last', 'Add a new line at the end of file'],
  ['no-extra-semi', 'Remove extra semicolon'],
  ['no-trailing-spaces', 'Remove trailing space'],
  ['no-var', "Replace 'var' with 'let'"],
  ['object-shorthand', 'Use shorthand property'],
  ['prefer-const', "Replace with 'const'"],
  ['prefer-template', 'Replace with template string literal'],
  ['quotes', 'Fix quotes'],
  ['radix', 'Add 10 as radix'],
  ['semi', 'Add semicolon'],
  ['sonarjs/prefer-immediate-return', 'Return value immediately'],
  ['sonarjs/prefer-while', "Use 'while' loop"],
  ['@typescript-eslint/no-empty-interface', 'Replace with type alias'],
  ['@typescript-eslint/no-inferrable-types', 'Remove type declaration'],
  ['@typescript-eslint/no-unnecessary-type-arguments', 'Remove type argument'],
  ['@typescript-eslint/no-unnecessary-type-assertion', 'Remove type assertion'],
  ['@typescript-eslint/prefer-namespace-keyword', "Replace with 'namespace' keyword"],
  ['@typescript-eslint/prefer-readonly', "Add 'readonly'"],
  ['@typescript-eslint/no-non-null-assertion', "Replace with optional chaining '.?'"],
]);

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
      message: getMessageForFix(eslintIssue.ruleId!),
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
  return !!issue.ruleId && quickFixRules.has(issue.ruleId);
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

function getMessageForFix(ruleKey: string): string {
  if (!quickFixMessages.has(ruleKey)) {
    console.log(`DEBUG Missing message for quick fix '${ruleKey}'`);
    return 'Fix this issue';
  }
  return quickFixMessages.get(ruleKey)!;
}
