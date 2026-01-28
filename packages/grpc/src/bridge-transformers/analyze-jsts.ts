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
import type { JsTsAnalysisInput, JsTsAnalysisOutput } from '../../../jsts/src/analysis/analysis.js';
import type { FileType } from '../../../shared/src/helpers/files.js';
import type { AnalysisMode, FileStatus } from '../../../jsts/src/analysis/analysis.js';
import { transformProjectConfiguration } from './configuration.js';

/**
 * Transform gRPC AnalyzeJsTsRequest to internal JsTsAnalysisInput format.
 */
export function transformAnalyzeJsTsRequest(
  request: bridge.IAnalyzeJsTsRequest,
): JsTsAnalysisInput {
  return {
    filePath: request.filePath || '',
    fileType: (request.fileType || 'MAIN') as FileType,
    fileContent: request.fileContent ?? undefined,
    ignoreHeaderComments: request.ignoreHeaderComments || false,
    tsConfigs: request.tsConfigs || [],
    fileStatus: (request.fileStatus || 'ADDED') as FileStatus,
    analysisMode: (request.analysisMode || 'DEFAULT') as AnalysisMode,
    skipAst: request.skipAst || false,
    clearDependenciesCache: request.shouldClearDependenciesCache || false,
    sonarlint: request.sonarlint || false,
    allowTsParserJsFiles: request.allowTsParserJsFiles || false,
    configuration: request.configuration
      ? transformProjectConfiguration(request.configuration)
      : undefined,
  };
}

/**
 * Transform internal JsTsAnalysisOutput to gRPC AnalyzeJsTsResponse format.
 */
export function transformAnalyzeJsTsResponse(
  result: JsTsAnalysisOutput & { parsingError?: { message: string; line?: number; code: string } },
): bridge.IAnalyzeJsTsResponse {
  return {
    parsingError: result.parsingError
      ? {
          message: result.parsingError.message,
          line: result.parsingError.line,
          code: result.parsingError.code,
        }
      : undefined,
    issues: (result.issues || []).map(issue => ({
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
    })),
    highlights: (result.highlights || []).map(h => ({
      location: {
        startLine: h.location.startLine,
        startCol: h.location.startCol,
        endLine: h.location.endLine,
        endCol: h.location.endCol,
      },
      textType: h.textType,
    })),
    highlightedSymbols: (result.highlightedSymbols || []).map(hs => ({
      declaration: {
        startLine: hs.declaration.startLine,
        startCol: hs.declaration.startCol,
        endLine: hs.declaration.endLine,
        endCol: hs.declaration.endCol,
      },
      references: (hs.references || []).map(ref => ({
        startLine: ref.startLine,
        startCol: ref.startCol,
        endLine: ref.endLine,
        endCol: ref.endCol,
      })),
    })),
    metrics: result.metrics
      ? {
          ncloc: result.metrics.ncloc || [],
          commentLines: result.metrics.commentLines || [],
          nosonarLines: result.metrics.nosonarLines || [],
          executableLines: result.metrics.executableLines || [],
          functions: result.metrics.functions || 0,
          statements: result.metrics.statements || 0,
          classes: result.metrics.classes || 0,
          complexity: result.metrics.complexity || 0,
          cognitiveComplexity: result.metrics.cognitiveComplexity || 0,
        }
      : undefined,
    cpdTokens: (result.cpdTokens || []).map(token => ({
      location: {
        startLine: token.location.startLine,
        startCol: token.location.startCol,
        endLine: token.location.endLine,
        endCol: token.location.endCol,
      },
      image: token.image,
    })),
    // AST is base64 encoded protobuf, convert string to bytes if present
    ast: 'ast' in result && result.ast ? Buffer.from(result.ast as string, 'base64') : undefined,
  };
}
