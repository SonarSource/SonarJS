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
import { Linter, Rule, SourceCode } from 'eslint';
import { getQuickFixMessage } from './messages.js';
import { QuickFix, QuickFixEdit } from './quickfix.js';

/**
 * Transforms ESLint fixes and suggestions into SonarLint quick fixes
 * @param source the source code
 * @param messages the ESLint messages to transform
 * @returns the transformed quick fixes
 */
export function transformFixes(source: SourceCode, messages: Linter.LintMessage): QuickFix[] {
  if (!hasQuickFix(messages)) {
    return [];
  }
  const quickFixes: QuickFix[] = [];
  if (messages.fix) {
    quickFixes.push({
      message: getQuickFixMessage(messages.ruleId!.slice(8) /* remove "sonarjs/" prefix*/),
      edits: [fixToEdit(source, messages.fix)],
    });
  }
  if (messages.suggestions) {
    for (const suggestion of messages.suggestions) {
      quickFixes.push({
        message: suggestion.desc,
        edits: [fixToEdit(source, suggestion.fix)],
      });
    }
  }
  return quickFixes;
}

/**
 * Checks if an ESLint fix is convertible into a SonarLint quick fix
 *
 * An ESLint fix is convertible into a SonarLint quick fix iff:
 * - it includes a fix or suggestions
 * - the quick fix of the rule is enabled
 *
 * @param message an ESLint message
 * @returns true if the message is convertible
 */
function hasQuickFix(message: Linter.LintMessage): boolean {
  return !!(message.fix || message.suggestions?.length);
}

/**
 * Transform an ESLint fix into a SonarLint quick fix edit
 * @param source the source code
 * @param fix the ESLint fix to transform
 * @returns the transformed SonarLint quick fix edit
 */
function fixToEdit(source: SourceCode, fix: Rule.Fix): QuickFixEdit {
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
