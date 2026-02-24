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
import { analyzer } from '../proto/language_analyzer.js';
import {
  type ProjectAnalysisOutput,
  entriesOfFileResults,
} from '../../../jsts/src/analysis/projectAnalysis/projectAnalysis.js';
import { reverseCssRuleKeyMap } from '../../../css/src/rules/metadata.js';
import type { JsTsIssue } from '../../../jsts/src/linter/issues/issue.js';
import type { CssIssue } from '../../../css/src/linter/issues/issue.js';
import { type NormalizedAbsolutePath } from '../../../jsts/src/rules/helpers/index.js';

/**
 * SonarQube rule key for parsing errors. When a file cannot be parsed,
 * the error is reported as an issue with this rule key.
 */
const PARSING_ERROR_RULE_KEY = 'S2260';

/**
 * Transform a single Issue from the internal format to the gRPC Issue format.
 *
 * Converts the ESLint-style issue representation into the protobuf format expected
 * by gRPC clients. This includes:
 * - Building the text range (start/end line and column offsets)
 * - Converting secondary locations into a flow with locations
 *
 * **Text Range Mapping:**
 * - `line` → `startLine`
 * - `endLine` → `endLine` (falls back to `line` if not set)
 * - `column` → `startOffset`
 * - `endColumn` → `endOffset` (falls back to `column` if not set)
 *
 * **Secondary Locations:**
 * Secondary locations provide additional context for issues (e.g., "this variable was declared here").
 * They are grouped into a single flow in the gRPC format with type FLOW_TYPE_DATA.
 *
 * @param issue - Internal Issue object from the linter
 * @returns gRPC Issue object ready for protobuf serialization
 */
function transformIssue(issue: JsTsIssue): analyzer.IIssue {
  const textRange: analyzer.ITextRange = {
    startLine: issue.line,
    startLineOffset: issue.column,
    endLine: issue.endLine ?? issue.line,
    endLineOffset: issue.endColumn ?? issue.column,
  };

  // Transform secondary locations into flows
  const flows: analyzer.IFlow[] = [];
  if (issue.secondaryLocations && issue.secondaryLocations.length > 0) {
    const locations: analyzer.IFlowLocation[] = issue.secondaryLocations.map(loc => ({
      textRange: {
        startLine: loc.line,
        startLineOffset: loc.column,
        endLine: loc.endLine,
        endLineOffset: loc.endColumn,
      },
      message: loc.message ?? '',
      file: issue.filePath,
    }));

    flows.push({
      type: analyzer.FlowType.FLOW_TYPE_DATA,
      description: '',
      locations,
    });
  }

  const repo = issue.language === 'js' ? 'javascript' : 'typescript';
  const ruleKey: analyzer.IRuleKey = {
    repo,
    rule: issue.ruleId,
  };

  return {
    filePath: issue.filePath,
    message: issue.message,
    rule: ruleKey,
    textRange,
    flows,
  };
}

/**
 * Transform a single CSS issue from the internal format to the gRPC Issue format.
 *
 * The stylelint rule key is
 * reverse-mapped to the SonarQube key via `reverseCssRuleKeyMap`.
 *
 * **Text Range Mapping:**
 * - `line` → `startLine`
 * - `endLine` → `endLine` (falls back to `line` if not set)
 * - `column` → `startOffset`
 * - `endColumn` → `endOffset` (falls back to `column` if not set)
 *
 * @param issue - Internal CSS issue from the stylelint linter
 * @param filePath - The file path the issue belongs to
 * @returns gRPC Issue object ready for protobuf serialization
 */
function transformCssIssue(issue: CssIssue, filePath: NormalizedAbsolutePath): analyzer.IIssue {
  const sqKey = reverseCssRuleKeyMap.get(issue.ruleId) ?? issue.ruleId;
  return {
    filePath,
    message: issue.message,
    rule: { repo: 'css', rule: sqKey },
    textRange: {
      startLine: issue.line,
      startLineOffset: issue.column,
      endLine: issue.endLine ?? issue.line,
      endLineOffset: issue.endColumn ?? issue.column,
    },
    flows: [],
  };
}

/**
 * Transform the ProjectAnalysisOutput into a gRPC AnalyzeResponse.
 *
 * This is the main entry point for response transformation in the gRPC workflow.
 * It processes the analysis results for all files and converts them into the
 * protobuf format expected by gRPC clients.
 *
 * **File Result Types:**
 * The ProjectAnalysisOutput contains a map of file paths to results, where each
 * result can be one of three types:
 *
 * 1. **Error** (`'error' in result`): Analysis failed for this file
 *    - Added to `analysisProblems` array with UNDEFINED type
 *
 * 2. **Parsing Error** (`'parsingError' in result`): File could not be parsed
 *    - Added to `analysisProblems` array with PARSING type
 *    - Also converted to an issue with rule S2260
 *
 * 3. **Success** (`'issues' in result`): Analysis completed successfully
 *    - All issues are transformed and added to the response
 *
 * **Response Structure:**
 * ```
 * IAnalyzeResponse
 *   ├── issues[] ──────────── All issues from successful analyses + parsing errors
 *   └── analysisProblems[] ── Structured problems with type, message, and file path
 * ```
 *
 * @param output - The ProjectAnalysisOutput from analyzeProject()
 * @returns gRPC IAnalyzeResponse ready for protobuf serialization
 */
export function transformProjectOutputToResponse(
  output: ProjectAnalysisOutput,
): analyzer.IAnalyzeResponse {
  const issues: analyzer.IIssue[] = [];
  const analysisProblems: analyzer.IAnalysisProblem[] = [];
  const measures: analyzer.IFileMeasures[] = [];

  for (const warning of output.meta.warnings) {
    analysisProblems.push({
      type: analyzer.AnalysisProblemType.ANALYSIS_PROBLEM_TYPE_UNDEFINED,
      message: warning,
      filePath: '',
    });
  }

  for (const [filePath, fileResult] of entriesOfFileResults(output.files)) {
    if ('error' in fileResult) {
      analysisProblems.push({
        type: analyzer.AnalysisProblemType.ANALYSIS_PROBLEM_TYPE_UNDEFINED,
        message: fileResult.error,
        filePath,
      });
      continue;
    }

    if ('parsingError' in fileResult) {
      const { message, line } = fileResult.parsingError;

      analysisProblems.push({
        type: analyzer.AnalysisProblemType.ANALYSIS_PROBLEM_TYPE_PARSING,
        message,
        filePath,
      });

      issues.push(
        transformIssue({
          ruleId: PARSING_ERROR_RULE_KEY,
          message,
          line: line ?? 1,
          column: 0,
          language: 'js',
          secondaryLocations: [],
          ruleESLintKeys: [],
          filePath,
        }),
      );
      continue;
    }

    if ('issues' in fileResult) {
      for (const issue of fileResult.issues) {
        switch (issue.language) {
          case 'css':
            issues.push(transformCssIssue(issue, filePath));
            break;
          case 'js':
          case 'ts':
            issues.push(transformIssue(issue));
            break;
        }
      }
      const ncloc = 'metrics' in fileResult ? fileResult.metrics?.ncloc : undefined;
      if (ncloc !== undefined) {
        measures.push({
          filePath,
          measures: [{ metricKey: 'ncloc', intValue: ncloc.length }],
        });
      }
    }
  }

  return {
    issues,
    analysisProblems,
    measures,
  };
}
