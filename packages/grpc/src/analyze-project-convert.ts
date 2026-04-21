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

import type { ProjectAnalysisOutput, FileResult } from '../../analysis/src/projectAnalysis.js';
import type { ProjectAnalysisTelemetry } from '../../analysis/src/telemetry.js';
import type { WsIncrementalResult } from '../../analysis/src/incremental-result.js';
import type { AnalyzeProjectPathMap } from './analyze-project-request.js';
import type {
  ParsingError as InternalParsingError,
  ParsingErrorLanguage,
} from '../../analysis/src/contracts/project-analysis.js';
import type {
  QuickFix,
  QuickFixEdit,
  Location as IssueLocation,
} from '../../analysis/src/contracts/location.js';
import type { CssIssue } from '../../analysis/src/css/linter/issues/issue.js';
import type { JsTsIssue } from '../../analysis/src/jsts/linter/issues/issue.js';
import type {
  CpdToken as InternalCpdToken,
  Location as InternalLocation,
  SymbolHighlight,
} from '../../analysis/src/jsts/analysis/file-artifacts.js';
import { ErrorCode } from '../../analysis/src/contracts/error.js';
import { sonarjs } from './proto/analyze-project.js';

type AnalyzeProjectStreamResponse = sonarjs.analyzeproject.v1.IAnalyzeProjectStreamResponse;
type AnalyzeProjectUnaryResponse = sonarjs.analyzeproject.v1.IAnalyzeProjectUnaryResponse;
type ProjectAnalysisFileResult = sonarjs.analyzeproject.v1.IProjectAnalysisFileResult;
type ProjectAnalysisMeta = sonarjs.analyzeproject.v1.IProjectAnalysisMeta;
type HighlightLike = { location: InternalLocation; textType: string };
type MetricsLike = {
  ncloc?: number[];
  commentLines?: number[];
  nosonarLines?: number[];
  executableLines?: number[];
  functions?: number;
  statements?: number;
  classes?: number;
  complexity?: number;
  cognitiveComplexity?: number;
};

const { AnalysisLanguage, ParsingErrorCode, TextType } = sonarjs.analyzeproject.v1;

export function toAnalyzeProjectUnaryResponse(
  output: ProjectAnalysisOutput,
  pathMap: AnalyzeProjectPathMap = new Map(),
): AnalyzeProjectUnaryResponse {
  const files: Record<string, ProjectAnalysisFileResult> = {};
  for (const [filePath, result] of Object.entries(output.files)) {
    files[restorePath(filePath, pathMap)] = toProjectAnalysisFileResult(result, pathMap);
  }
  return {
    files,
    meta: toProjectAnalysisMeta(output.meta),
  };
}

export function toAnalyzeProjectStreamResponse(
  result: WsIncrementalResult,
  pathMap: AnalyzeProjectPathMap = new Map(),
): AnalyzeProjectStreamResponse {
  switch (result.messageType) {
    case 'fileResult':
      return {
        fileResult: {
          filePath: restorePath(result.filename, pathMap),
          result: toProjectAnalysisFileResult(result, pathMap),
        },
      };
    case 'meta':
      return {
        meta: toProjectAnalysisMeta(result),
      };
    case 'cancelled':
      return {
        cancelled: {},
      };
    case 'error':
      // Typed gRPC currently routes request failures through RequestResult instead of the
      // incremental channel. Keep this guard in case the analysis engine emits stream errors again.
      throw new Error('Unexpected stream error event in typed gRPC response conversion');
    default:
      return assertNever(result);
  }
}

function restorePath(filePath: string, pathMap: AnalyzeProjectPathMap): string;
function restorePath(filePath: undefined, pathMap: AnalyzeProjectPathMap): undefined;
function restorePath(filePath: string | undefined, pathMap: AnalyzeProjectPathMap) {
  return filePath == null ? filePath : (pathMap.get(filePath) ?? filePath);
}

function toProjectAnalysisFileResult(
  result: FileResult,
  pathMap: AnalyzeProjectPathMap,
): ProjectAnalysisFileResult {
  if ('error' in result) {
    return {
      error: result.error,
    };
  }

  return {
    parsingErrors: (result.parsingErrors ?? []).map(toParsingError),
    issues: result.issues.map(issue => toIssue(issue, pathMap)),
    highlights: ('highlights' in result ? result.highlights : undefined)?.map(toHighlight) ?? [],
    highlightedSymbols:
      ('highlightedSymbols' in result ? result.highlightedSymbols : undefined)?.map(
        toHighlightedSymbol,
      ) ?? [],
    metrics: result.metrics ? toMetrics(result.metrics) : undefined,
    cpdTokens: ('cpdTokens' in result ? result.cpdTokens : undefined)?.map(toCpdToken) ?? [],
    ast: 'ast' in result && result.ast != null ? Buffer.from(result.ast, 'base64') : undefined,
  };
}

function toProjectAnalysisMeta(meta: {
  warnings: string[];
  telemetry?: ProjectAnalysisTelemetry;
}): ProjectAnalysisMeta {
  return {
    warnings: [...meta.warnings],
    telemetry: meta.telemetry ? toTelemetry(meta.telemetry) : undefined,
  };
}

function toTelemetry(
  telemetry: ProjectAnalysisTelemetry,
): sonarjs.analyzeproject.v1.IProjectAnalysisTelemetry {
  return {
    typescriptVersions: [...telemetry.typescriptVersions],
    typescriptNativePreview: telemetry.typescriptNativePreview,
    compilerOptions: Object.fromEntries(
      Object.entries(telemetry.compilerOptions).map(([option, values]) => [option, { values }]),
    ),
    ecmaScriptVersions: [...telemetry.ecmaScriptVersions],
    programCreation: telemetry.programCreation,
    esmFileCount: telemetry.esmFileCount,
    cjsFileCount: telemetry.cjsFileCount,
  };
}

function toParsingError(error: InternalParsingError): sonarjs.analyzeproject.v1.IParsingError {
  return {
    message: error.message,
    line: error.line,
    column: error.column,
    code: toParsingErrorCode(error.code),
    language: toAnalysisLanguage(error.language),
  };
}

function toIssue(
  issue: JsTsIssue | CssIssue,
  pathMap: AnalyzeProjectPathMap,
): sonarjs.analyzeproject.v1.IIssue {
  return {
    line: issue.line,
    column: issue.column,
    endLine: issue.endLine,
    endColumn: issue.endColumn,
    message: issue.message,
    ruleId: issue.ruleId,
    language: toAnalysisLanguage(issue.language),
    secondaryLocations:
      'secondaryLocations' in issue ? issue.secondaryLocations.map(toIssueLocation) : [],
    cost: 'cost' in issue ? issue.cost : undefined,
    quickFixes: 'quickFixes' in issue ? (issue.quickFixes ?? []).map(toQuickFix) : [],
    ruleEslintKeys: 'ruleESLintKeys' in issue ? [...issue.ruleESLintKeys] : [],
    filePath: 'filePath' in issue ? restorePath(issue.filePath, pathMap) : undefined,
  };
}

function toQuickFix(quickFix: QuickFix): sonarjs.analyzeproject.v1.IQuickFix {
  return {
    message: quickFix.message,
    edits: quickFix.edits.map(toQuickFixEdit),
  };
}

function toQuickFixEdit(edit: QuickFixEdit): sonarjs.analyzeproject.v1.IQuickFixEdit {
  return {
    text: edit.text,
    loc: toIssueLocation(edit.loc),
  };
}

function toIssueLocation(location: IssueLocation): sonarjs.analyzeproject.v1.IIssueLocation {
  return {
    line: location.line,
    column: location.column,
    endLine: location.endLine,
    endColumn: location.endColumn,
    message: location.message,
  };
}

function toHighlight(highlight: HighlightLike): sonarjs.analyzeproject.v1.IHighlight {
  return {
    location: toLocation(highlight.location),
    textType: toTextType(highlight.textType),
  };
}

function toHighlightedSymbol(
  highlightedSymbol: SymbolHighlight,
): sonarjs.analyzeproject.v1.IHighlightedSymbol {
  return {
    declaration: toLocation(highlightedSymbol.declaration),
    references: highlightedSymbol.references.map(toLocation),
  };
}

function toMetrics(metrics: MetricsLike): sonarjs.analyzeproject.v1.IMetrics {
  return {
    ncloc: [...(metrics.ncloc ?? [])],
    commentLines: [...(metrics.commentLines ?? [])],
    nosonarLines: [...(metrics.nosonarLines ?? [])],
    executableLines: [...(metrics.executableLines ?? [])],
    functions: metrics.functions,
    statements: metrics.statements,
    classes: metrics.classes,
    complexity: metrics.complexity,
    cognitiveComplexity: metrics.cognitiveComplexity,
  };
}

function toCpdToken(cpdToken: InternalCpdToken): sonarjs.analyzeproject.v1.ICpdToken {
  return {
    location: toLocation(cpdToken.location),
    image: cpdToken.image,
  };
}

function toLocation(location: InternalLocation): sonarjs.analyzeproject.v1.ILocation {
  return {
    startLine: location.startLine,
    startCol: location.startCol,
    endLine: location.endLine,
    endCol: location.endCol,
  };
}

function toParsingErrorCode(
  code: InternalParsingError['code'],
): sonarjs.analyzeproject.v1.ParsingErrorCode {
  switch (code) {
    case ErrorCode.Parsing:
      return ParsingErrorCode.PARSING_ERROR_CODE_PARSING;
    case ErrorCode.FailingTypeScript:
      return ParsingErrorCode.PARSING_ERROR_CODE_FAILING_TYPESCRIPT;
    case ErrorCode.LinterInitialization:
      return ParsingErrorCode.PARSING_ERROR_CODE_LINTER_INITIALIZATION;
    default:
      return ParsingErrorCode.PARSING_ERROR_CODE_UNSPECIFIED;
  }
}

function toAnalysisLanguage(
  language: ParsingErrorLanguage | JsTsIssue['language'] | CssIssue['language'],
): sonarjs.analyzeproject.v1.AnalysisLanguage {
  switch (language) {
    case 'js':
      return AnalysisLanguage.ANALYSIS_LANGUAGE_JS;
    case 'ts':
      return AnalysisLanguage.ANALYSIS_LANGUAGE_TS;
    case 'css':
      return AnalysisLanguage.ANALYSIS_LANGUAGE_CSS;
    default:
      return AnalysisLanguage.ANALYSIS_LANGUAGE_UNSPECIFIED;
  }
}

function toTextType(textType: string): sonarjs.analyzeproject.v1.TextType {
  switch (textType) {
    case 'CONSTANT':
      return TextType.TEXT_TYPE_CONSTANT;
    case 'COMMENT':
      return TextType.TEXT_TYPE_COMMENT;
    case 'STRUCTURED_COMMENT':
      return TextType.TEXT_TYPE_STRUCTURED_COMMENT;
    case 'KEYWORD':
      return TextType.TEXT_TYPE_KEYWORD;
    case 'STRING':
      return TextType.TEXT_TYPE_STRING;
    default:
      return TextType.TEXT_TYPE_UNSPECIFIED;
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected incremental analysis result: ${JSON.stringify(value)}`);
}
