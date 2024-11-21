/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import stylelint from 'stylelint';
import { debug } from '../../../../shared/src/helpers/logging.js';
import { Issue } from './issue.js';

/**
 * Transforms Stylelint linting results into SonarQube issues
 * @param results the Stylelint linting results
 * @param filePath the path of the linted file
 * @returns the transformed SonarQube issues
 */
export function transform(results: stylelint.LintResult[], filePath: string): Issue[] {
  const issues: Issue[] = [];
  /**
   * There should be only one element in 'results' as we are analyzing
   * only one file at a time.
   */
  results.forEach(result => {
    /** Avoids reporting on "fake" source like <input css 1>  */
    if (result.source !== filePath) {
      debug(
        `For file [${filePath}] received issues with [${result.source}] as a source. They will not be reported.`,
      );
      return;
    }
    result.warnings.forEach(warning =>
      issues.push({
        ruleId: warning.rule,
        line: warning.line,
        column: warning.column,
        message: warning.text,
      }),
    );
  });
  return issues;
}
