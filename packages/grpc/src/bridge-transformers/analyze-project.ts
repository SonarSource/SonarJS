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
  ProjectAnalysisInput,
  JsTsFiles,
  FileResult,
} from '../../../jsts/src/analysis/projectAnalysis/projectAnalysis.js';
import type { RuleConfig } from '../../../jsts/src/linter/config/rule-config.js';
import type { FileType } from '../../../shared/src/helpers/files.js';
import type { JsTsLanguage } from '../../../shared/src/helpers/configuration.js';
import type { AnalysisMode, FileStatus } from '../../../jsts/src/analysis/analysis.js';
import { transformAnalyzeJsTsResponse } from './analyze-jsts.js';
import { transformProjectConfiguration } from './configuration.js';

/**
 * Transform gRPC AnalyzeProjectRequest to internal ProjectAnalysisInput format.
 */
export function transformAnalyzeProjectRequest(
  request: bridge.IAnalyzeProjectRequest,
): ProjectAnalysisInput {
  const files: JsTsFiles = {};

  if (request.files) {
    for (const [key, value] of Object.entries(request.files)) {
      files[key] = {
        filePath: value.filePath || '',
        fileType: (value.fileType || 'MAIN') as FileType,
        fileStatus: (value.fileStatus || 'ADDED') as FileStatus,
        fileContent: value.fileContent ?? undefined,
      };
    }
  }

  return {
    files,
    rules: transformRules(request.rules || []),
    configuration: request.configuration
      ? transformProjectConfiguration(request.configuration)
      : undefined,
    bundles: request.bundles || [],
    rulesWorkdir: request.rulesWorkdir || '',
  };
}

/**
 * Transform gRPC EslintRule array to internal RuleConfig array.
 */
function transformRules(rules: bridge.IEslintRule[]): RuleConfig[] {
  return rules.map(rule => ({
    key: rule.key || '',
    fileTypeTargets: (rule.fileTypeTargets || []) as FileType[],
    configurations: (rule.configurations || []).map(c => {
      try {
        return JSON.parse(c);
      } catch {
        return c;
      }
    }),
    analysisModes: (rule.analysisModes || ['DEFAULT']) as AnalysisMode[],
    blacklistedExtensions: rule.blacklistedExtensions || [],
    language: (rule.language || 'js') as JsTsLanguage,
  }));
}

/**
 * Transform a file analysis result to gRPC FileAnalysisResult format.
 */
export function transformFileResult(
  filename: string,
  result: FileResult,
): bridge.IFileAnalysisResult {
  // Handle different result types
  if ('error' in result) {
    // Error result - return empty analysis with parsing error
    return {
      filename,
      analysis: {
        parsingError: {
          message: result.error,
          code: 'GENERAL_ERROR',
        },
        issues: [],
      },
    };
  }

  if ('parsingError' in result) {
    // Parsing error result
    return {
      filename,
      analysis: {
        parsingError: {
          message: result.parsingError.message,
          line: result.parsingError.line,
          code: result.parsingError.code,
        },
        issues: [],
      },
    };
  }

  // Success result with issues
  return {
    filename,
    analysis: transformAnalyzeJsTsResponse(result as any),
  };
}

/**
 * Transform an error to gRPC AnalysisError format.
 */
export function transformError(error: {
  code?: string;
  message: string;
  stack?: string;
}): bridge.IAnalysisError {
  return {
    code: error.code || 'GENERAL_ERROR',
    message: error.message,
    stack: error.stack,
  };
}
