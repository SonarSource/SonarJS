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
import type { NormalizedAbsolutePath } from '../../../jsts/src/rules/helpers/files.js';

/**
 * SonarQube rule key for parsing errors. When a file cannot be parsed,
 * the error is reported as an issue with this rule key.
 */
const PARSING_ERROR_RULE_KEY = 'S2260';
const PARSING_ERROR_REPO_BY_LANGUAGE = {
  css: 'css',
  js: 'javascript',
  ts: 'typescript',
} as const;

function isValidOneBasedLine(line: number): line is number {
  return line >= 1;
}

function toTextRange(
  line: number,
  column: number,
  endLine: number | undefined,
  endColumn: number | undefined,
): analyzer.ITextRange | undefined {
  if (!isValidOneBasedLine(line)) {
    return undefined;
  }

  const resolvedEndLine = endLine ?? line;
  if (!isValidOneBasedLine(resolvedEndLine)) {
    return undefined;
  }

  const startLineOffset = column ?? 0;
  return {
    startLine: line,
    startLineOffset,
    endLine: resolvedEndLine,
    endLineOffset: endColumn ?? startLineOffset,
  };
}

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
 * - `column` → `startLineOffset`
 * - `endColumn` → `endLineOffset` (falls back to `column` if not set)
 *
 * **Secondary Locations:**
 * Secondary locations provide additional context for issues (e.g., "this variable was declared here").
 * They are grouped into a single flow in the gRPC format with type FLOW_TYPE_DATA.
 *
 * @param issue - Internal Issue object from the linter
 * @returns gRPC Issue object ready for protobuf serialization
 */
function transformIssue(issue: JsTsIssue): analyzer.IIssue {
  const textRange = toTextRange(issue.line, issue.column, issue.endLine, issue.endColumn);

  // Transform secondary locations into flows
  const flows: analyzer.IFlow[] = [];
  if (issue.secondaryLocations && issue.secondaryLocations.length > 0) {
    const locations: analyzer.IFlowLocation[] = [];

    for (const loc of issue.secondaryLocations) {
      const range = toTextRange(loc.line, loc.column, loc.endLine, loc.endColumn);
      if (range !== undefined) {
        locations.push({
          textRange: range,
          message: loc.message ?? '',
          filePath: issue.filePath,
        });
      }
    }

    if (locations.length > 0) {
      flows.push({
        type: analyzer.FlowType.FLOW_TYPE_DATA,
        description: '',
        locations,
      });
    }
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
 * End line/column fall back to start values when not provided by stylelint.
 *
 * @param issue - Internal CSS issue from the stylelint linter
 * @param filePath - The file path the issue belongs to
 * @returns gRPC Issue object ready for protobuf serialization
 */
function transformCssIssue(issue: CssIssue, filePath: string): analyzer.IIssue {
  const sqKey = reverseCssRuleKeyMap.get(issue.ruleId) ?? issue.ruleId;
  return {
    filePath,
    message: issue.message,
    rule: { repo: 'css', rule: sqKey },
    textRange: toTextRange(issue.line, issue.column, issue.endLine, issue.endColumn),
    flows: [],
  };
}

/**
 * Transform a parsing error into a gRPC issue.
 *
 * Mirrors Java-side behavior: when line is missing, the issue is file-level
 * and does not carry a text range.
 */
function transformParsingErrorIssue(
  message: string,
  filePath: NormalizedAbsolutePath,
  line: number | undefined,
  column: number | undefined,
  language: 'css' | 'js' | 'ts',
): analyzer.IIssue {
  const repo = PARSING_ERROR_REPO_BY_LANGUAGE[language];
  return {
    filePath,
    message,
    rule: { repo, rule: PARSING_ERROR_RULE_KEY },
    textRange:
      line !== undefined ? toTextRange(line, column ?? 0, undefined, undefined) : undefined,
    flows: [],
  };
}

/**
 * Look up the original path from the path map, falling back to the normalized path.
 */
function restorePath(filePath: NormalizedAbsolutePath, pathMap: Map<string, string>): string {
  return pathMap.get(filePath) ?? filePath;
}

/**
 * Transform the ProjectAnalysisOutput into a gRPC AnalyzeResponse.
 *
 * This is the main entry point for response transformation in the gRPC workflow.
 * It processes the analysis results for all files and converts them into the
 * protobuf format expected by gRPC clients.
 *
 * **File Result Fields:**
 * A file result may carry one or more of these fields:
 *
 * 1. **Error** (`'error' in result`): Analysis failed for this file
 *    - Added to `analysisProblems` array with UNDEFINED type
 *
 * 2. **Issues** (`'issues' in result`): Regular analyzer issues
 *    - All issues are transformed and added to the response
 *
 * 3. **Parsing Errors** (`'parsingErrors' in result`): Parser failures
 *    - Each error is added to `analysisProblems` array with PARSING type
 *    - Each error is also converted to an issue with rule S2260
 *
 * **Response Structure:**
 * ```
 * IAnalyzeResponse
 *   ├── issues[] ──────────── All issues from successful analyses + parsing errors
 *   └── analysisProblems[] ── Structured problems with type, message, and file path
 * ```
 *
 * @param output - The ProjectAnalysisOutput from analyzeProject()
 * @param pathMap - Optional mapping from normalized absolute paths to original request paths
 * @returns gRPC IAnalyzeResponse ready for protobuf serialization
 */
export function transformProjectOutputToResponse(
  output: ProjectAnalysisOutput,
  pathMap: Map<string, string> = new Map(),
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
    const originalPath = restorePath(filePath, pathMap);

    if ('error' in fileResult) {
      analysisProblems.push({
        type: analyzer.AnalysisProblemType.ANALYSIS_PROBLEM_TYPE_UNDEFINED,
        message: fileResult.error,
        filePath: originalPath,
      });
      continue;
    }

    if ('issues' in fileResult) {
      for (const issue of fileResult.issues) {
        switch (issue.language) {
          case 'css':
            issues.push(transformCssIssue(issue, originalPath));
            break;
          case 'js':
          case 'ts':
            issues.push(
              transformIssue({ ...issue, filePath: originalPath as NormalizedAbsolutePath }),
            );
            break;
        }
      }
      const ncloc = 'metrics' in fileResult ? fileResult.metrics?.ncloc : undefined;
      if (ncloc !== undefined) {
        measures.push({
          filePath: originalPath,
          measures: [{ metricKey: 'ncloc', intValue: ncloc.length }],
        });
      }
    }

    if ('parsingErrors' in fileResult) {
      for (const { message, line, column, language } of fileResult.parsingErrors ?? []) {
        analysisProblems.push({
          type: analyzer.AnalysisProblemType.ANALYSIS_PROBLEM_TYPE_PARSING,
          message,
          filePath: originalPath,
        });

        issues.push(
          transformParsingErrorIssue(
            message,
            originalPath as NormalizedAbsolutePath,
            line,
            column,
            language,
          ),
        );
      }
    }
  }

  return {
    issues,
    analysisProblems,
    measures,
  };
}
