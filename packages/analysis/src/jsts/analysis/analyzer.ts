/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { debug } from '../../../../shared/src/helpers/logging.js';
import type { Linter as ESLintLinter, SourceCode } from 'eslint';
import type { JsTsAnalysisInput, JsTsAnalysisOutput } from './analysis.js';
import type { TSESTree } from '@typescript-eslint/utils';
import { Linter } from '../linter/linter.js';
import { build } from '../builders/build.js';
import { serializeInProtobufSafely } from '../parsers/ast.js';
import { extractSonarResolveCommentsFromJsTsComments } from '../../common/sonar-resolve.js';
import {
  collectMainFileArtifacts,
  collectNoSonarMetrics,
  collectTestFileArtifacts,
} from './file-artifacts.js';
import {
  toProjectFailureResult,
  type ProjectFailureResult,
} from '../../../src/contracts/project-analysis.js';
import {
  type InternalMetricsSink,
  toInternalMetricsSettings,
} from '../rules/helpers/internal-metrics.js';
import { DEFAULT_ECMA_VERSION, type ParserContext } from '../parsers/options.js';
import { getOptionalProjectAnalysisTelemetryCollector } from '../../telemetry.js';

const COGNITIVE_COMPLEXITY_RULE_ID = 'sonarjs/S3776';
const COGNITIVE_COMPLEXITY_SILENCE_ISSUES_OPTION = 'silence-issues';

interface AnalysisLinterOptions {
  additionalRules?: ESLintLinter.RulesRecord;
  additionalSettings?: Record<string, unknown>;
  metricsSink?: InternalMetricsSink;
}

export type UnserializedJsTsAnalysisOutput = Omit<JsTsAnalysisOutput, 'ast'> & {
  unserializedAst?: TSESTree.Program;
};

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
  const result = await analyzeJSTSUnserialized(input);
  if (result.unserializedAst) {
    const { unserializedAst, ...output } = result;
    const ast = serializeInProtobufSafely(unserializedAst, input.filePath);
    return ast ? { ast, ...output } : output;
  }
  return result;
}

async function analyzeJSTSUnserialized(
  input: JsTsAnalysisInput,
): Promise<UnserializedJsTsAnalysisOutput> {
  debug(`Analyzing file "${input.filePath}"`);
  const {
    filePath,
    ruleFileType,
    analysisMode,
    fileStatus,
    language,
    detectedEsYear,
    targetEsYear,
  } = input;
  const detectedModuleType = Linter.detectModuleType(filePath);
  getOptionalProjectAnalysisTelemetryCollector()?.recordModuleType(detectedModuleType);

  if (detectedEsYear === undefined) {
    debug(
      `No ECMAScript version detected for "${filePath}"; using default ${DEFAULT_ECMA_VERSION}`,
    );
  }
  if (detectedModuleType === undefined) {
    debug(`No module type detected for "${filePath}"`);
  }

  const parserContext: ParserContext = { detectedEsYear };
  const parseResult = build(input, parserContext);
  const { additionalRules, additionalSettings, metricsSink } = prepareLinterOptions(input);
  const { issues, suppressedIssues } = Linter.lint(
    parseResult,
    filePath,
    ruleFileType,
    fileStatus,
    analysisMode,
    language,
    detectedEsYear,
    detectedModuleType,
    { additionalRules, additionalSettings },
    targetEsYear,
  );
  getOptionalProjectAnalysisTelemetryCollector()?.recordPackageImports(
    Linter.collectPackageImports(parseResult.sourceCode, filePath),
  );
  const extendedMetrics = computeExtendedMetrics(
    input,
    parseResult.sourceCode,
    metricsSink?.cognitiveComplexity,
  );
  const sonarResolveComments = extractSonarResolveCommentsFromJsTsComments(
    parseResult.sourceCode.ast.comments ?? [],
  );

  const result = {
    issues,
    ...(suppressedIssues.length > 0 ? { suppressedIssues } : {}),
    ...extendedMetrics,
    ...(sonarResolveComments.length > 0 ? { sonarResolveComments } : {}),
  };

  if (!input.skipAst) {
    return {
      unserializedAst: parseResult.sourceCode.ast as TSESTree.Program,
      ...result,
    };
  }

  return result;
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
): Promise<UnserializedJsTsAnalysisOutput | ProjectFailureResult> {
  try {
    return await analyzeJSTSUnserialized(input);
  } catch (err) {
    return toProjectFailureResult(err, input.language);
  }
}

/**
 * Computes extended metrics about the analyzed code
 *
 * Computed extended metrics may differ depending on the analysis context:
 *
 * - SonarLint doesn't care about code metrics except for `NOSONAR` comments
 * - All kinds of metrics are considered for main files.
 * - NCLOC, symbol highlighting, syntax highlighting and `NOSONAR` comments are considered
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
    return collectTestFileArtifacts(sourceCode);
  }
}
