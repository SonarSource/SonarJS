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
import type { CssAnalysisInput, CssAnalysisOutput } from '../../../css/src/analysis/analysis.js';
import { transformProjectConfiguration } from './configuration.js';

/**
 * Transform gRPC AnalyzeCssRequest to internal CssAnalysisInput format.
 */
export function transformAnalyzeCssRequest(request: bridge.IAnalyzeCssRequest): CssAnalysisInput {
  return {
    filePath: request.filePath || '',
    fileContent: request.fileContent ?? undefined,
    rules: (request.rules || []).map(rule => ({
      key: rule.key || '',
      configurations: (rule.configurations || []).map(c => {
        try {
          return JSON.parse(c);
        } catch {
          return c;
        }
      }),
    })),
    configuration: request.configuration
      ? transformProjectConfiguration(request.configuration)
      : undefined,
  };
}

/**
 * Transform internal CssAnalysisOutput to gRPC AnalyzeCssResponse format.
 */
export function transformAnalyzeCssResponse(
  result: CssAnalysisOutput & { parsingError?: { message: string; line?: number; code: string } },
): bridge.IAnalyzeCssResponse {
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
      // CSS issues don't have endLine/endColumn
      message: issue.message,
      ruleId: issue.ruleId,
    })),
  };
}
