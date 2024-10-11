/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { debug, info } from '../../../shared/src/helpers/logging.js';
import { SourceCode } from 'eslint';
import { JsTsAnalysisInput, JsTsAnalysisOutput } from './analysis.js';
import { TSESTree } from '@typescript-eslint/utils';
import { JsTsLanguage } from '../../../shared/src/helpers/language.js';
import { getLinter } from '../linter/linters.js';
import { buildSourceCode } from '../builders/build.js';
import { LinterWrapper } from '../linter/wrapper.js';
import { APIError } from '../../../shared/src/errors/error.js';
import { serializeInProtobuf } from '../parsers/ast.js';
import { SymbolHighlight } from '../linter/visitors/symbol-highlighting.js';
import { getContext } from '../../../shared/src/helpers/context.js';
import { computeMetrics, findNoSonarLines } from '../linter/visitors/metrics/index.js';
import { getSyntaxHighlighting } from '../linter/visitors/syntax-highlighting.js';
import { getCpdTokens } from '../linter/visitors/cpd.js';

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
 * @param language the language of the analysis input
 * @returns the JavaScript / TypeScript analysis output
 */
export function analyzeJSTS(input: JsTsAnalysisInput, language: JsTsLanguage): JsTsAnalysisOutput {
  debug(`Analyzing file "${input.filePath}" with linterId "${input.linterId}"`);
  const linter = getLinter(input.linterId);
  return analyzeFile(linter, input, buildSourceCode(input, language));
}

/**
 * Analyzes a parsed ESLint SourceCode instance
 *
 * Analyzing a parsed ESLint SourceCode instance consists in linting the source code
 * and computing extended metrics about the code. At this point, the linting results
 * are already SonarQube-compatible and can be consumed back as such by the sensor.
 *
 * @param linter the linter to use for the analysis
 * @param input the JavaScript / TypeScript analysis input to analyze
 * @param sourceCode the corresponding parsed ESLint SourceCode instance
 * @returns the JavaScript / TypeScript analysis output
 */
function analyzeFile(
  linter: LinterWrapper,
  input: JsTsAnalysisInput,
  sourceCode: SourceCode,
): JsTsAnalysisOutput {
  try {
    const { filePath, fileType, language } = input;
    const { issues, highlightedSymbols, cognitiveComplexity, ucfgPaths } = linter.lint(
      sourceCode,
      filePath,
      fileType,
      language,
    );
    const extendedMetrics = computeExtendedMetrics(
      input,
      sourceCode,
      highlightedSymbols,
      cognitiveComplexity,
    );

    const result: JsTsAnalysisOutput = {
      issues,
      ucfgPaths,
      ...extendedMetrics,
    };

    if (!input.skipAst) {
      const ast = serializeAst(sourceCode, filePath);
      if (ast) {
        result.ast = ast;
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
    return serializeInProtobuf(sourceCode.ast as TSESTree.Program);
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
  if (getContext().sonarlint) {
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
