/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { type NormalizedAbsolutePath } from '../../../shared/src/helpers/files.js';

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

export type SuppressedIssue<T extends BaseIssue = BaseIssue> = T & {
  resolutionComment: string;
};

export interface SonarResolveComment {
  line: number;
  text: string;
}

/**
 * An analysis output
 *
 * A common interface for all kinds of analysis output.
 * Generic parameter T allows specifying a more specific issue type.
 * Generic parameter S narrows which issue subtype can appear in `suppressedIssues`.
 *
 * @template T the issue type, must extend BaseIssue
 * @template S the suppressible issue subtype, must extend T
 */
export interface AnalysisOutput<
  T extends BaseIssue = BaseIssue,
  S extends T = T,
> {
  issues: T[];
  suppressedIssues?: SuppressedIssue<S>[];
  sonarResolveComments?: SonarResolveComment[];
}

/**
 * A sanitized analysis input of embedded code with all required fields populated.
 *
 * This extends AnalysisInput which already has all required fields (filePath, fileContent, sonarlint).
 * Additional embedded-specific fields can be added here in the future.
 */
export interface EmbeddedAnalysisInput extends AnalysisInput {}
