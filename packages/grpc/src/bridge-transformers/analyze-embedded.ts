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
import type { bridge } from '../proto/bridge.js';
import type {
  EmbeddedAnalysisInput,
  EmbeddedAnalysisOutput,
} from '../../../jsts/src/embedded/analysis/analysis.js';
import { transformProjectConfiguration } from './configuration.js';

/**
 * Transform gRPC AnalyzeYamlRequest to internal EmbeddedAnalysisInput format.
 */
export function transformAnalyzeYamlRequest(
  request: bridge.IAnalyzeYamlRequest,
): EmbeddedAnalysisInput {
  return {
    filePath: request.filePath || '',
    fileContent: request.fileContent ?? undefined,
    configuration: request.configuration
      ? transformProjectConfiguration(request.configuration)
      : undefined,
  };
}

/**
 * Transform internal EmbeddedAnalysisOutput to gRPC AnalyzeYamlResponse format.
 */
export function transformAnalyzeYamlResponse(
  result: EmbeddedAnalysisOutput & {
    parsingError?: { message: string; line?: number; code: string };
  },
): bridge.IAnalyzeYamlResponse {
  return {
    parsingError: result.parsingError
      ? {
          message: result.parsingError.message,
          line: result.parsingError.line,
          code: result.parsingError.code,
        }
      : undefined,
    issues: transformIssues(result.issues),
    metrics: {
      ncloc: result.metrics?.ncloc || [],
    },
  };
}

/**
 * Transform gRPC AnalyzeHtmlRequest to internal EmbeddedAnalysisInput format.
 */
export function transformAnalyzeHtmlRequest(
  request: bridge.IAnalyzeHtmlRequest,
): EmbeddedAnalysisInput {
  return {
    filePath: request.filePath || '',
    fileContent: request.fileContent ?? undefined,
    configuration: request.configuration
      ? transformProjectConfiguration(request.configuration)
      : undefined,
  };
}

/**
 * Transform internal EmbeddedAnalysisOutput to gRPC AnalyzeHtmlResponse format.
 */
export function transformAnalyzeHtmlResponse(
  result: EmbeddedAnalysisOutput & {
    parsingError?: { message: string; line?: number; code: string };
  },
): bridge.IAnalyzeHtmlResponse {
  return {
    parsingError: result.parsingError
      ? {
          message: result.parsingError.message,
          line: result.parsingError.line,
          code: result.parsingError.code,
        }
      : undefined,
    issues: transformIssues(result.issues),
    metrics: {
      ncloc: result.metrics?.ncloc || [],
    },
  };
}

/**
 * Transform internal issues to gRPC Issue format.
 */
function transformIssues(issues: EmbeddedAnalysisOutput['issues']): bridge.IIssue[] {
  return (issues || []).map(issue => ({
    line: issue.line,
    column: issue.column,
    endLine: issue.endLine,
    endColumn: issue.endColumn,
    message: issue.message,
    ruleId: issue.ruleId,
    language: issue.language,
    secondaryLocations: (issue.secondaryLocations || []).map(loc => ({
      line: loc.line,
      column: loc.column,
      endLine: loc.endLine,
      endColumn: loc.endColumn,
      message: loc.message,
    })),
    cost: issue.cost,
    quickFixes: (issue.quickFixes || []).map(qf => ({
      message: qf.message,
      edits: (qf.edits || []).map(edit => ({
        text: edit.text,
        loc: {
          line: edit.loc.line,
          column: edit.loc.column,
          endLine: edit.loc.endLine,
          endColumn: edit.loc.endColumn,
        },
      })),
    })),
    ruleEslintKeys: issue.ruleESLintKeys || [],
    filePath: issue.filePath,
  }));
}
