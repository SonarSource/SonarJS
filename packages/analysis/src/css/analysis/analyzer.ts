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
import type { CssAnalysisInput, CssAnalysisOutput } from './analysis.js';
import { linter } from '../linter/wrapper.js';
import { computeMetrics } from './metrics.js';
import { computeHighlighting } from './highlighting.js';
import { APIError } from '../../contracts/error.js';
import {
  toProjectFailureResult,
  type ProjectFailureResult,
} from '../../contracts/project-analysis.js';
import { warn } from '../../../../shared/src/helpers/logging.js';
import type { CssIssue } from '../linter/issues/issue.js';

/**
 * Analyzes a CSS analysis input
 *
 * Analyzing a CSS analysis input is rather straighforward. All that is needed
 * is to create a Stylelint configuration based on the rules from the active
 * quality profile and uses this configuration to linter the input file.
 *
 * The input must be fully sanitized (all fields required) before calling this function.
 *
 * Stylelint config comes from the pre-initialized linter
 * (`LinterWrapper.initialize()`). For TEST files, rules are overridden to an
 * empty config to suppress issues while preserving parsing/highlighting behavior.
 * The CSS linter must be initialized before calling this function.
 *
 * Behavior:
 *
 * CSS in HTML/Vue MAIN: linted for issues, no CSS metrics.
 * CSS in HTML/Vue TEST: not linted (noMetrics + TEST early return), so no CSS issues.
 * Pure CSS MAIN: issues + metrics/highlighting.
 * Pure CSS TEST: no issues/metrics, highlighting only
 *
 * @param input the sanitized CSS analysis input to analyze
 * @param includeMetrics whether to include metrics calculation
 * @returns a promise of the CSS analysis output
 */
export async function analyzeCSS(
  input: CssAnalysisInput,
  includeMetrics = true,
): Promise<CssAnalysisOutput> {
  const { filePath, fileContent, fileType } = input;

  const isTestFile = fileType === 'TEST';

  // Mixed-file CSS analysis (HTML/Vue) runs with noMetrics=true. For TEST files,
  // preserve legacy behavior by skipping CSS linting entirely.
  if (isTestFile && !includeMetrics) {
    return { issues: [] };
  }
  const sanitizedCode = fileContent
    .replaceAll(/[\u2000-\u200F]/g, ' ')
    // PostCSS tracks lines by splitting on '\n'; normalize CR-only files to keep locations stable.
    .replaceAll(/\r(?!\n)/g, '\n');

  // TEST files keep highlighting (parity with old CssMetricSensor), but issues remain suppressed.
  const lintResult = await linter.lint(filePath, sanitizedCode, fileType);
  const { root, issues: lintingIssues } = lintResult;
  throwIfCssParsingError(lintingIssues);
  const issues = isTestFile ? [] : lintingIssues;

  // Skip metrics and highlighting for non-pure-CSS files
  // (HTML/Vue files are handled by their own analyzers for metrics)
  if (!includeMetrics || !root) {
    return { issues };
  }

  try {
    if (input.sonarlint) {
      const metrics = computeMetrics(root);
      // In SonarLint context, keep only NOSONAR lines (parity with JS/TS and old sensors).
      return {
        issues,
        metrics: { nosonarLines: metrics.nosonarLines },
      };
    } else {
      const highlights = computeHighlighting(root, sanitizedCode);
      if (isTestFile) {
        return { issues, highlights };
      }
      return {
        issues,
        highlights,
        metrics: computeMetrics(root),
      };
    }
  } catch (err) {
    warn(`Failed to compute metrics/highlighting for ${filePath}: ${err}`);
    return { issues };
  }
}

export async function analyzeCSSProject(
  input: CssAnalysisInput,
  includeMetrics = true,
): Promise<CssAnalysisOutput | ProjectFailureResult> {
  try {
    return await analyzeCSS(input, includeMetrics);
  } catch (err) {
    return toProjectFailureResult(err, 'css');
  }
}

function throwIfCssParsingError(issues: CssIssue[]) {
  const parsingIssue = issues.find(issue => issue.ruleId === 'CssSyntaxError');
  if (parsingIssue) {
    throw APIError.parsingError(parsingIssue.message, {
      line: parsingIssue.line,
      column: parsingIssue.column,
    });
  }
}
