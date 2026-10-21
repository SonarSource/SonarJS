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
import { extractSonarResolveCommentsFromCssRoot } from '../../common/sonar-resolve.js';
import type { FileType } from '../../contracts/file.js';

// Invisible characters from U+2000 to U+200F, such as U+200B ZERO WIDTH SPACE
const INVISIBLE_CHARACTER = /[\u2000-\u200F]/;
const INVISIBLE_CHARACTERS = new RegExp(INVISIBLE_CHARACTER.source, 'g');

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
 * (`LinterWrapper.initialize()`). Rule selection uses `ruleFileType`: when it is TEST, rules are
 * overridden to an empty config to suppress issues. Metrics and highlighting follow `fileType`.
 * The CSS linter must be initialized before calling this function.
 *
 * Behavior:
 *
 * CSS in HTML/Vue MAIN: linted for issues, no CSS metrics.
 * CSS in HTML/Vue TEST: not linted (noMetrics + TEST early return), so no CSS issues.
 * Pure CSS MAIN: issues + metrics/highlighting.
 * Pure CSS MAIN with TEST rule selection: no issues, metrics/highlighting kept.
 * Pure CSS TEST: no issues, NCLOC/NOSONAR metrics and highlighting
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
  const ruleFileType = input.ruleFileType ?? fileType;

  const isTestFile = fileType === 'TEST';

  // Mixed-file CSS analysis (HTML/Vue) runs with noMetrics=true. For TEST files,
  // preserve legacy behavior by skipping CSS linting entirely.
  if (isTestFile && !includeMetrics) {
    return { issues: [] };
  }
  // PostCSS tracks lines by splitting on '\n'; normalize CR-only files to keep locations stable.
  const normalizedCode = fileContent.replaceAll(/\r(?!\n)/g, '\n');

  // TEST files keep highlighting (parity with old CssMetricSensor), but issues remain suppressed.
  const {
    code: lintedCode,
    root,
    issues: lintingIssues,
  } = await lintWithInvisibleCharactersFallback(filePath, normalizedCode, ruleFileType);
  throwIfCssParsingError(lintingIssues);
  const issues = isTestFile ? [] : lintingIssues;
  const sonarResolveComments = root ? extractSonarResolveCommentsFromCssRoot(root) : [];

  // Skip metrics and highlighting for non-pure-CSS files
  // (HTML/Vue files are handled by their own analyzers for metrics)
  if (!includeMetrics || !root) {
    return {
      issues,
      ...(sonarResolveComments.length > 0 ? { sonarResolveComments } : {}),
    };
  }

  try {
    if (input.sonarlint) {
      const metrics = computeMetrics(root, {
        includeNcloc: false,
        includeCommentLines: false,
        includeNoSonar: true,
      });
      // In SonarLint context, keep only NOSONAR lines (parity with JS/TS and old sensors).
      return {
        issues,
        metrics: { nosonarLines: metrics.nosonarLines },
        ...(sonarResolveComments.length > 0 ? { sonarResolveComments } : {}),
      };
    } else {
      const highlights = computeHighlighting(root, lintedCode);
      const metrics = computeMetrics(root, {
        includeNcloc: true,
        includeCommentLines: !isTestFile,
        includeNoSonar: true,
      });
      if (isTestFile) {
        return {
          issues,
          highlights,
          metrics: { ncloc: metrics.ncloc, nosonarLines: metrics.nosonarLines },
          ...(sonarResolveComments.length > 0 ? { sonarResolveComments } : {}),
        };
      }
      return {
        issues,
        highlights,
        metrics,
        ...(sonarResolveComments.length > 0 ? { sonarResolveComments } : {}),
      };
    }
  } catch (err) {
    warn(`Failed to compute metrics/highlighting for ${filePath}: ${err}`);
    return {
      issues,
      ...(sonarResolveComments.length > 0 ? { sonarResolveComments } : {}),
    };
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

/**
 * Lints the code as written, so that rules see invisible characters such as U+200B. PostCSS rejects
 * them where it expects no word, for example before a closing brace. Code that fails to parse and
 * contains them is linted again with a space in place of each, which keeps every location.
 */
async function lintWithInvisibleCharactersFallback(
  filePath: CssAnalysisInput['filePath'],
  code: string,
  ruleFileType: FileType | undefined,
): Promise<Awaited<ReturnType<typeof linter.lint>> & { code: string }> {
  const result = await linter.lint(filePath, code, ruleFileType);
  if (!findParsingError(result.issues) || !INVISIBLE_CHARACTER.test(code)) {
    return { ...result, code };
  }
  const sanitizedCode = code.replaceAll(INVISIBLE_CHARACTERS, ' ');
  return { ...(await linter.lint(filePath, sanitizedCode, ruleFileType)), code: sanitizedCode };
}

function findParsingError(issues: CssIssue[]): CssIssue | undefined {
  return issues.find(issue => issue.ruleId === 'CssSyntaxError');
}

function throwIfCssParsingError(issues: CssIssue[]) {
  const parsingIssue = findParsingError(issues);
  if (parsingIssue) {
    throw APIError.parsingError(parsingIssue.message, {
      line: parsingIssue.line,
      column: parsingIssue.column,
    });
  }
}
