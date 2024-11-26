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
import { Linter, SourceCode } from 'eslint';
import { transformFixes } from '../quickfixes/transform.js';
import { Issue } from './issue.js';
import { error } from '../../../../shared/src/helpers/logging.js';

/**
 * Converts an ESLint message into a SonarQube issue
 *
 * Converting an ESLint message into a SonarQube issue consists in extracting
 * the relevant properties from the message for the most of it. Furthermore,
 * it transforms ESLint fixes into SonarLint quick fixes, if any. On the other
 * hand, encoded secondary locations remain in the issue message at this stage
 * and are decoded in a subsequent step.
 *
 * @param source the source code
 * @param message the ESLint message to convert
 * @returns the converted SonarQube issue
 */
export function convertMessage(source: SourceCode, message: Linter.LintMessage): Issue | null {
  /**
   * The property `ruleId` equals `null` on parsing errors, but it should not
   * happen because we lint ready SourceCode instances and not file contents.
   */
  if (!message.ruleId) {
    error("Illegal 'null' ruleId for eslint issue");
    return null;
  }
  return {
    ruleId: message.ruleId,
    line: message.line,
    column: message.column,
    endLine: message.endLine,
    endColumn: message.endColumn,
    message: message.message,
    quickFixes: transformFixes(source, message),
    secondaryLocations: [],
  };
}
