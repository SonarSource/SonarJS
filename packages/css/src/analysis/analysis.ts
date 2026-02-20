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
 * A CSS analysis output
 *
 * Computing data analysis like metrics does nit realy makes
 * sense in the context of stylesheets. Therefore, only issues
 * form the content of a CSS analysis output beside an analysis
 * error.
 *
 * @param issues
 */
export interface CssAnalysisOutput extends AnalysisOutput<CssIssue> {}
