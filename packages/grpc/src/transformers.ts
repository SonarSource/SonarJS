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
import { dirname } from 'node:path/posix';
import type { analyzer } from './proto/language_analyzer.js';
import type {
  ProjectAnalysisInput,
  ProjectAnalysisOutput,
  JsTsFiles,
} from '../../jsts/src/analysis/projectAnalysis/projectAnalysis.js';
import type { RuleConfig } from '../../jsts/src/linter/config/rule-config.js';
import type { Issue } from '../../jsts/src/linter/issues/issue.js';

/**
 * Find common base directory from a list of file paths
 */
function findCommonBaseDir(filePaths: string[]): string {
  if (filePaths.length === 0) {
    return '/';
  }
  if (filePaths.length === 1) {
    return dirname(filePaths[0]);
  }

  const parts = filePaths.map(p => p.split('/'));
  const minLength = Math.min(...parts.map(p => p.length));

  let commonParts: string[] = [];
  for (let i = 0; i < minLength; i++) {
    const part = parts[0][i];
    if (parts.every(p => p[i] === part)) {
      commonParts.push(part);
    } else {
      break;
    }
  }

  // If the last common part is a file, remove it
  const result = commonParts.join('/');
  return result || '/';
}

/**
 * Transform a gRPC AnalyzeFileRequest into the analyzeProject input format
 */
export function transformRequestToProjectInput(
  request: analyzer.IAnalyzeFileRequest,
): ProjectAnalysisInput {
  // Handle empty/undefined arrays from proto3
  const sourceFiles = request.sourceFiles || [];
  const activeRules = request.activeRules || [];

  // Transform source files to JsTsFiles format
  const files: JsTsFiles = {};
  const filePaths: string[] = [];

  for (const sourceFile of sourceFiles) {
    const relativePath = sourceFile.relativePath ?? '';
    files[relativePath] = {
      filePath: relativePath,
      fileContent: sourceFile.content ?? '',
      fileType: 'MAIN', // Default to MAIN, we will need metadata from context to know for sure
    };
    filePaths.push(relativePath);
  }

  // Determine baseDir from file paths
  const baseDir = findCommonBaseDir(filePaths);

  // Transform active rules to RuleConfig format
  // For each rule, we create two entries: one for JS and one for TS
  // This ensures rules work for both languages
  const rules: RuleConfig[] = [];
  for (const activeRule of activeRules) {
    // Extract rule params as configurations
    const configurations: any[] = [];
    const params = activeRule.params || [];
    if (params.length > 0) {
      const paramsObj: Record<string, unknown> = {};
      for (const param of params) {
        // Try to parse numeric values
        const numValue = Number(param.value);
        paramsObj[param.key ?? ''] = !isNaN(numValue) ? numValue : param.value;
      }
      configurations.push(paramsObj);
    }

    // Add rule for both JS and TS to support both languages
    for (const language of ['js', 'ts'] as const) {
      rules.push({
        key: activeRule.ruleKey ?? '',
        configurations,
        fileTypeTargets: ['MAIN', 'TEST'],
        language,
        analysisModes: ['DEFAULT'],
      });
    }
  }

  return {
    files,
    rules,
    configuration: {
      baseDir,
      // gRPC requests contain all file contents inline - no filesystem access needed
      canAccessFileSystem: false,
    },
  };
}

const PARSING_ERROR_RULE_KEY = 'S2260';

/**
 * Transform analyzeProject output into a gRPC AnalyzeFileResponse
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

/**
 * Transform a single Issue to analyzer.IIssue format
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
