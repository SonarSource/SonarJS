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
import type { AnalysisInput, AnalysisOutput } from '../../../src/contracts/analysis.js';
import type { FileType } from '../../../src/contracts/file.js';
import type { CssIssue } from '../linter/issues/issue.js';

/**
 * A CSS analysis input.
 *
 * CSS analysis uses the global linter configuration initialized by
 * `LinterWrapper.initialize()` in project analysis.
 *
 * For TEST files, rules are overridden to an empty set internally.
 */
export interface CssAnalysisInput extends AnalysisInput {
  fileType?: FileType;
}

/**
 * A location range within a CSS source file.
 *
 * Lines are 1-based, columns are 0-based (matching SonarQube conventions).
 */
export interface CssLocation {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}

/**
 * A syntax highlight token within a CSS source file.
 *
 * @param location the source range to highlight
 * @param textType the highlight category (e.g. COMMENT, KEYWORD, STRING)
 */
export interface CssSyntaxHighlight {
  location: CssLocation;
  textType: string;
}

/**
 * Metrics computed from a CSS source file.
 *
 * CSS metrics only include line-based metrics and NOSONAR locations.
 */
export interface CssMetrics {
  ncloc?: number[];
  commentLines?: number[];
  nosonarLines: number[];
}

/**
 * A CSS analysis output
 *
 * Contains linting issues and, when not running in SonarLint mode,
 * syntax highlighting tokens and file metrics.
 */
export interface CssAnalysisOutput extends AnalysisOutput<CssIssue> {
  highlights?: CssSyntaxHighlight[];
  metrics?: CssMetrics;
}
