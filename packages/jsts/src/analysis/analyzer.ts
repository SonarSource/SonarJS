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
import type { Linter as ESLintLinter, SourceCode } from 'eslint';
import type { JsTsAnalysisInput, JsTsAnalysisOutput } from './analysis.js';
import type { TSESTree } from '@typescript-eslint/utils';
import { Linter } from '../linter/linter.js';
import { build } from '../builders/build.js';
import { APIError } from '../../../shared/src/errors/error.js';
import { serializeInProtobuf } from '../parsers/ast.js';
import {
  collectMainFileArtifacts,
  collectNoSonarMetrics,
  collectTestFileArtifacts,
} from './file-artifacts.js';
import { clearDependenciesCache } from '../rules/helpers/package-jsons/index.js';
import type { NormalizedAbsolutePath } from '../rules/helpers/files.js';
import {
  toProjectFailureResult,
  type ProjectFailureResult,
} from '../../../shared/src/errors/project-analysis.js';
import {
  type InternalMetricsSink,
  toInternalMetricsSettings,
} from '../rules/helpers/internal-metrics.js';

const COGNITIVE_COMPLEXITY_RULE_ID = 'sonarjs/S3776';
const COGNITIVE_COMPLEXITY_SILENCE_ISSUES_OPTION = 'silence-issues';

interface AnalysisLinterOptions {
  additionalRules?: ESLintLinter.RulesRecord;
  additionalSettings?: Record<string, unknown>;
  metricsSink?: InternalMetricsSink;
}

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
 * The input must be fully sanitized (all fields required) before calling this function.
 *
 * @param input the sanitized JavaScript / TypeScript analysis input to analyze
 * @returns the JavaScript / TypeScript analysis output
 */
export async function analyzeJSTS(input: JsTsAnalysisInput): Promise<JsTsAnalysisOutput> {
  debug(`Analyzing file "${input.filePath}"`);
  const { filePath, fileType, analysisMode, fileStatus, language, detectedEsYear } = input;

  const parseResult = build(input);
  try {
    if (input.clearDependenciesCache) {
      debug('Clearing dependencies cache');
      clearDependenciesCache();
    }
    const { additionalRules, additionalSettings, metricsSink } = prepareLinterOptions(input);
    const { issues } = Linter.lint(
      parseResult,
      filePath,
      fileType,
      fileStatus,
      analysisMode,
      language,
      detectedEsYear,
      { additionalRules, additionalSettings },
    );
    const extendedMetrics = computeExtendedMetrics(
      input,
      parseResult.sourceCode,
      metricsSink?.cognitiveComplexity,
    );

    const result = {
      issues,
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
    if (e.stack.includes('typescript.js:')) {
      throw APIError.failingTypeScriptError(e.message);
    } else {
      throw e;
    }
  }
}

function prepareLinterOptions(input: JsTsAnalysisInput): AnalysisLinterOptions {
  if (input.sonarlint || input.fileType !== 'MAIN') {
    return {};
  }

  const metricsSink: InternalMetricsSink = {};
  return {
    additionalRules: {
      [COGNITIVE_COMPLEXITY_RULE_ID]: ['error', COGNITIVE_COMPLEXITY_SILENCE_ISSUES_OPTION],
    },
    additionalSettings: toInternalMetricsSettings(metricsSink),
    metricsSink,
  };
}

export async function analyzeJSTSProject(
  input: JsTsAnalysisInput,
): Promise<JsTsAnalysisOutput | ProjectFailureResult> {
  try {
    return await analyzeJSTS(input);
  } catch (err) {
    return toProjectFailureResult(err, input.language);
  }
}

function serializeAst(sourceCode: SourceCode, filePath: NormalizedAbsolutePath) {
  try {
    return serializeInProtobuf(sourceCode.ast as TSESTree.Program, filePath);
  } catch {
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
 * @param cognitiveComplexity the computed cognitive complexity of the code
 * @returns the extended metrics of the code
 */
function computeExtendedMetrics(
  input: JsTsAnalysisInput,
  sourceCode: SourceCode,
  cognitiveComplexity?: number,
) {
  if (input.sonarlint) {
    return { metrics: collectNoSonarMetrics(sourceCode) };
  }
  const { fileType, ignoreHeaderComments } = input;
  if (fileType === 'MAIN') {
    return collectMainFileArtifacts(sourceCode, ignoreHeaderComments, cognitiveComplexity);
  } else {
    return collectTestFileArtifacts(sourceCode, input.reportNclocForTestFiles);
  }
}
