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
import { type NormalizedAbsolutePath } from '../helpers/files.js';

/**
 * A sanitized analysis input with all required fields populated.
 *
 * This is the internal type used after sanitization. All fields are required
 * because sanitization fills in defaults and reads file content if needed.
 *
 * @param filePath the normalized absolute path of the file to analyze
 * @param fileContent the content of the file to analyze
 * @param sonarlint whether analysis is running in SonarLint context
 */
export interface AnalysisInput {
  filePath: NormalizedAbsolutePath;
  fileContent: string;
  sonarlint: boolean;
}

/**
 * Base issue interface with common fields for all issue types.
 *
 * This provides the minimal structure that all analysis issues must have.
 * Specific analyzers (JS/TS, CSS, etc.) extend this with additional fields
 * and add a narrowed `language` discriminant.
 *
 * @param ruleId the rule key that reported the issue
 * @param line the issue starting line (1-based)
 * @param column the issue starting column (0-based)
 * @param message the issue message describing the problem
 * @param endLine the issue ending line (1-based, optional)
 * @param endColumn the issue ending column (0-based, optional)
 */
export interface BaseIssue {
  ruleId: string;
  line: number;
  column: number;
  message: string;
  endLine?: number;
  endColumn?: number;
}

/**
 * An analysis output
 *
 * A common interface for all kinds of analysis output.
 * Generic parameter I allows specifying a more specific issue type.
 *
 * @template I the issue type, must extend BaseIssue
 */
export interface AnalysisOutput<I extends BaseIssue = BaseIssue> {
  issues: I[];
}

/**
 * A sanitized analysis input of embedded code with all required fields populated.
 *
 * This extends AnalysisInput which already has all required fields (filePath, fileContent, sonarlint).
 * Additional embedded-specific fields can be added here in the future.
 */
export interface EmbeddedAnalysisInput extends AnalysisInput {}
