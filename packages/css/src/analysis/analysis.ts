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
import type { AnalysisInput, AnalysisOutput } from '../../../shared/src/types/analysis.js';
import type { RuleConfig } from '../linter/config.js';
import type { CssIssue } from '../linter/issues/index.js';

/**
 * A CSS analysis input
 *
 * A CSS analysis input only needs an input file and a set
 * of rule configurations to analyze a stylesheet.
 *
 * When `rules` are provided (bridge per-request path), a fresh config is created.
 * When `rules` are absent (analyzeProject path), the linter must be pre-initialized.
 *
 * @param rules the rules from the active quality profile (optional when linter is pre-initialized)
 */
export interface CssAnalysisInput extends AnalysisInput {
  rules?: RuleConfig[];
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
 * CSS files have limited metric semantics compared to JS/TS, so
 * functions, statements, classes, complexity, and cognitiveComplexity
 * are always 0. The primary metrics are ncloc and commentLines.
 */
export interface CssMetrics {
  ncloc: number[];
  commentLines: number[];
  nosonarLines: number[];
  executableLines: number[];
  functions: number;
  statements: number;
  classes: number;
  complexity: number;
  cognitiveComplexity: number;
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
