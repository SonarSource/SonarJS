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
import { debug, info } from '../../../shared/src/helpers/logging.js';
import { SourceCode } from 'eslint';
import {
  fillLanguage,
  JsTsAnalysisInput,
  JsTsAnalysisOutput,
  JsTsAnalysisOutputWithAst,
} from './analysis.js';
import type { TSESTree } from '@typescript-eslint/utils';
import { Linter } from '../linter/linter.js';
import { build } from '../builders/build.js';
import { APIError } from '../../../shared/src/errors/error.js';
import { serializeInProtobuf } from '../parsers/ast.js';
import { SymbolHighlight } from '../linter/visitors/symbol-highlighting.js';
import { computeMetrics, findNoSonarLines } from '../linter/visitors/metrics/index.js';
import { getSyntaxHighlighting } from '../linter/visitors/syntax-highlighting.js';
import { getCpdTokens } from '../linter/visitors/cpd.js';
import { clearDependenciesCache, getAllDependencies } from '../rules/index.js';
import { Telemetry } from '../../../bridge/src/request.js';
import { fillFileContent } from '../../../shared/src/types/analysis.js';

/**
 * Analyzes a JavaScript / TypeScript analysis input
 *
 * Analyzing a JavaScript / TypeScript analysis input implies building
 * an ESLint SourceCode instance, meaning parsing the actual code to get
 * an abstract syntax tree to operate on. Any parsing error is returned
 * immediately. Otherwise, the analysis proceeds with the actual linting
 * of the source code. The linting result is returned along with some
 * analysis performance data.
 *
 * The analysis requires that global linter wrapper is initialized.
 *
 * @param input the JavaScript / TypeScript analysis input to analyze
 * @returns the JavaScript / TypeScript analysis output
 */
export async function analyzeJSTS(
  input: JsTsAnalysisInput,
): Promise<JsTsAnalysisOutput | JsTsAnalysisOutputWithAst> {
  debug(`Analyzing file "${input.filePath}"`);
  const completeInput = fillLanguage(await fillFileContent(input));
  const parseResult = build(completeInput);
  try {
    const { filePath, fileType, analysisMode, fileStatus, language } = completeInput;
    if (completeInput.clearDependenciesCache) {
      debug('Clearing dependencies cache');
      clearDependenciesCache();
    }
    const { issues, highlightedSymbols, cognitiveComplexity, ucfgPaths } = Linter.lint(
      parseResult,
      filePath,
      fileType,
      fileStatus,
      analysisMode,
      language,
    );
    const extendedMetrics = computeExtendedMetrics(
      input,
      parseResult.sourceCode,
      highlightedSymbols,
      cognitiveComplexity,
    );

    const result = {
      issues,
      ucfgPaths,
      ...extendedMetrics,
    };

    if (!input.skipAst) {
      const ast = serializeAst(parseResult.sourceCode, filePath);
      if (ast) {
        return {
          ast,
          ...result,
        };
      }
    }

    return result;
  } catch (e) {
    /** Turns exceptions from TypeScript compiler into "parsing" errors */
    if (e.stack.indexOf('typescript.js:') > -1) {
      throw APIError.failingTypeScriptError(e.message);
    } else {
      throw e;
    }
  }
}

function serializeAst(sourceCode: SourceCode, filePath: string) {
  try {
    return serializeInProtobuf(sourceCode.ast as TSESTree.Program, filePath);
  } catch (e) {
    info(`Failed to serialize AST for file "${filePath}"`);
    return null;
  }
}

/**
 * Computes extended metrics about the analyzed code
 *
 * Computed extended metrics may differ depending on the analysis context:
 *
 * - SonarLint doesn't care about code metrics except for `NOSONAR` comments
 * - All kinds of metrics are considered for main files.
 * - Symbol highlighting, syntax highlighting and `NOSONAR` comments are only consider
 *   for test files.
 *
 * @param input the JavaScript / TypeScript analysis input to analyze
 * @param sourceCode the analyzed ESLint SourceCode instance
 * @param highlightedSymbols the computed symbol highlighting of the code
 * @param cognitiveComplexity the computed cognitive complexity of the code
 * @returns the extended metrics of the code
 */
function computeExtendedMetrics(
  input: JsTsAnalysisInput,
  sourceCode: SourceCode,
  highlightedSymbols: SymbolHighlight[],
  cognitiveComplexity?: number,
) {
  if (input.sonarlint) {
    return { metrics: findNoSonarLines(sourceCode) };
  }
  const { fileType, ignoreHeaderComments } = input;
  if (fileType === 'MAIN') {
    return {
      highlightedSymbols,
      highlights: getSyntaxHighlighting(sourceCode).highlights,
      metrics: computeMetrics(sourceCode, !!ignoreHeaderComments, cognitiveComplexity),
      cpdTokens: getCpdTokens(sourceCode).cpdTokens,
    };
  } else {
    return {
      highlightedSymbols,
      highlights: getSyntaxHighlighting(sourceCode).highlights,
      metrics: findNoSonarLines(sourceCode),
    };
  }
}

export function getTelemetry(): Telemetry {
  return {
    dependencies: getAllDependencies(),
  };
}
