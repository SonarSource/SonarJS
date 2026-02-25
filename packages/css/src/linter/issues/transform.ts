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
import type stylelint from 'stylelint';
import { debug, warn } from '../../../../shared/src/helpers/logging.js';
import type { CssIssue } from './issue.js';
import type { NormalizedAbsolutePath } from '../../../../shared/src/helpers/files.js';

/**
 * Checks if a position value (line or column) is valid.
 * Stylelint may return null/NaN for certain edge cases (e.g., empty SASS blocks in Vue files).
 */
function isValidPosition(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1;
}

/**
 * Transforms Stylelint linting results into SonarQube issues
 * @param results the Stylelint linting results
 * @param filePath the path of the linted file
 * @param lineLengths number of characters per line (0-indexed), used to clamp end positions
 * @returns the transformed SonarQube issues
 */
export function transform(
  results: stylelint.LintResult[],
  filePath: NormalizedAbsolutePath,
  lineLengths: number[],
): CssIssue[] {
  const issues: CssIssue[] = [];
  /**
   * There should be only one element in 'results' as we are analyzing
   * only one file at a time.
   */
  for (const result of results) {
    /** Avoids reporting on "fake" source like <input css 1>  */
    if (result.source !== filePath) {
      debug(
        `For file [${filePath}] received issues with [${result.source}] as a source. They will not be reported.`,
      );
      continue;
    }
    for (const warning of result.warnings) {
      const line = isValidPosition(warning.line) ? warning.line : 1;
      // Stylelint columns are 1-based; SonarQube expects 0-based
      const column = isValidPosition(warning.column) ? warning.column - 1 : 0;

      if (!isValidPosition(warning.line) || !isValidPosition(warning.column)) {
        warn(
          `Invalid position for rule ${warning.rule} in ${filePath}: ` +
            `line=${warning.line}, column=${warning.column}. Defaulting to line=${line}, column=${column}.`,
        );
      }

      const issue: CssIssue = {
        ruleId: warning.rule,
        line,
        column,
        message: normalizeMessage(warning.text),
        language: 'css',
      };

      if (isValidPosition(warning.endLine) && isValidPosition(warning.endColumn)) {
        const endLine = warning.endLine;
        const endColumn = warning.endColumn - 1;
        const maxEndColumn = lineLengths[endLine - 1];
        if (maxEndColumn !== undefined && endColumn <= maxEndColumn) {
          issue.endLine = endLine;
          issue.endColumn = endColumn;
        }
      }

      issues.push(issue);
    }
  }
  return issues;
}

/**
 * Strips the trailing `(rulekey)` suffix from Stylelint messages.
 * Stylelint formats messages as "Description text (rule-name)".
 * SonarQube only needs the description.
 */
function normalizeMessage(message: string): string {
  return message.replace(/\([a-zA-Z/@-]+\)$/, '').trim();
}
