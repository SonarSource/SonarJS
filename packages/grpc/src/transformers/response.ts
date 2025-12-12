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
import type { analyzer } from '../proto/language_analyzer.js';
import type { ProjectAnalysisOutput } from '../../../jsts/src/analysis/projectAnalysis/projectAnalysis.js';
import type { Issue } from '../../../jsts/src/linter/issues/issue.js';

/**
 * SonarQube rule key for parsing errors. When a file cannot be parsed,
 * the error is reported as an issue with this rule key.
 */
const PARSING_ERROR_RULE_KEY = 'S2260';

/**
 * Transform a single Issue from the internal format to the gRPC IIssue format.
 *
 * Converts the ESLint-style issue representation into the protobuf format expected
 * by gRPC clients. This includes:
 * - Building the text range (start/end line and column offsets)
 * - Converting secondary locations into a flow with locations
 * - Generating a unique issue ID from rule, file, and position
 *
 * **Text Range Mapping:**
 * - `line` → `startLine`
 * - `endLine` → `endLine` (falls back to `line` if not set)
 * - `column` → `startOffset`
 * - `endColumn` → `endOffset` (falls back to `column` if not set)
 *
 * **Secondary Locations:**
 * Secondary locations provide additional context for issues (e.g., "this variable was declared here").
 * They are grouped into a single flow in the gRPC format.
 *
 * @param issue - Internal Issue object from the linter
 * @returns gRPC IIssue object ready for protobuf serialization
 */
function transformIssue(issue: Issue): analyzer.IIssue {
  const textRange: analyzer.ITextRange = {
    startLine: issue.line,
    endLine: issue.endLine ?? issue.line,
    startOffset: issue.column,
    endOffset: issue.endColumn ?? issue.column,
  };

  // Transform secondary locations into flows
  const flows: analyzer.IFlow[] = [];
  if (issue.secondaryLocations && issue.secondaryLocations.length > 0) {
    // Group secondary locations into a single flow
    const locations: analyzer.IFlowLocation[] = issue.secondaryLocations.map(loc => ({
      textRange: {
        startLine: loc.line,
        endLine: loc.endLine,
        startOffset: loc.column,
        endOffset: loc.endColumn,
      },
      message: loc.message ?? '',
      file: issue.filePath,
    }));

    flows.push({ locations });
  }

  return {
    id: `${issue.ruleId}:${issue.filePath}:${issue.line}:${issue.column}`,
    filePath: issue.filePath,
    message: issue.message,
    rule: issue.ruleId,
    textRange,
    flows,
  };
}

/**
 * Transform the ProjectAnalysisOutput into a gRPC AnalyzeFileResponse.
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
 *    - Added to `analysisProblems` array with file path context
 *
 * 2. **Parsing Error** (`'parsingError' in result`): File could not be parsed
 *    - Converted to an issue with rule S2260 (parsing error rule)
 *    - Includes the error message and line number
 *
 * 3. **Success** (`'issues' in result`): Analysis completed successfully
 *    - All issues are transformed and added to the response
 *
 * **Response Structure:**
 * ```
 * IAnalyzeFileResponse
 *   ├── issues[] ──────────── All issues from successful analyses + parsing errors
 *   └── analysisProblems[] ── Warnings from meta + error messages for failed files
 * ```
 *
 * @param output - The ProjectAnalysisOutput from analyzeProject()
 * @returns gRPC IAnalyzeFileResponse ready for protobuf serialization
 */
export function transformProjectOutputToResponse(
  output: ProjectAnalysisOutput,
): analyzer.IAnalyzeFileResponse {
  const issues: analyzer.IIssue[] = [];
  const analysisProblems: string[] = [...output.meta.warnings];

  // Process each file result
  for (const [filePath, fileResult] of Object.entries(output.files)) {
    if ('error' in fileResult) {
      analysisProblems.push(`Error analyzing ${filePath}: ${fileResult.error}`);
      continue;
    }

    if ('parsingError' in fileResult) {
      // Report parsing errors as issues with rule S2260
      const { message, line } = fileResult.parsingError;
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

    // Extract issues from successful analysis
    if ('issues' in fileResult) {
      for (const issue of fileResult.issues) {
        issues.push(transformIssue(issue));
      }
    }
  }

  return {
    issues,
    analysisProblems,
  };
}
