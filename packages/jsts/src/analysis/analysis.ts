/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { FileType } from '../../../shared/src/helpers/files.js';
import { isJsFile, isTsFile, JsTsLanguage } from '../../../shared/src/helpers/language.js';
import { AnalysisInput, AnalysisOutput } from '../../../shared/src/types/analysis.js';
import { ErrorCode } from '../../../shared/src/errors/error.js';
import { SyntaxHighlight } from '../linter/visitors/syntax-highlighting.js';
import { SymbolHighlight } from '../linter/visitors/symbol-highlighting.js';
import { Metrics } from '../linter/visitors/metrics/metrics.js';
import { CpdToken } from '../linter/visitors/cpd.js';
import { Issue } from '../linter/issues/issue.js';

/**
 *
 * A JavaScript / TypeScript analysis input
 *
 * On SonarLint and Vue projects, TSConfig-based analysis relies on an automatically
 * created TypeScript Program's instance by TypeScript ESLint parser, which leaves
 * to it the lifecycle of such an instance.
 *
 * For all other cases, analysis relies on an automatically created TypeScript Program's
 * instance based on a TSConfig to control the lifecycle of the main internal
 * data structure used by TypeScript ESLint parser for performance reasons.
 *
 * @param fileType the file type to select the proper linting configuration
 * @param ignoreHeaderComments a flag used by some rules to ignore header comments
 * @param tsConfigs a list of TSConfigs
 * @param language the file language ('js' or 'ts')
 * @param programId the identifier of a TypeScript Program's instance
 */
export interface JsTsAnalysisInput extends AnalysisInput {
  fileType: FileType;
  language?: JsTsLanguage;
  ignoreHeaderComments?: boolean;
  allowTsParserJsFiles?: boolean;
  tsConfigs?: string[];
  programId?: string;
  skipAst?: boolean;
  analysisMode?: AnalysisMode;
  fileStatus?: FileStatus;
  shouldClearDependenciesCache?: boolean;
}

export type CompleteJsTsAnalysisInput = Omit<JsTsAnalysisInput, 'language' | 'fileContent'> & {
  language: JsTsLanguage;
  fileContent: string;
};

export type AnalysisMode = 'DEFAULT' | 'SKIP_UNCHANGED';
export type FileStatus = 'SAME' | 'CHANGED' | 'ADDED';

export interface ParsingError {
  message: string;
  line?: number;
  code: ErrorCode;
}

/**
 * A JavaScript / TypeScript analysis output
 */
export interface SuccessfulJsTsAnalysisOutput extends AnalysisOutput {
  issues: Issue[];
  highlights?: SyntaxHighlight[];
  highlightedSymbols?: SymbolHighlight[];
  metrics?: Metrics;
  cpdTokens?: CpdToken[];
  ucfgPaths?: string[];
  ast?: Uint8Array;
}

export function isSuccessfulAnalysisOutput(
  analysis: AnalysisOutput,
): analysis is SuccessfulJsTsAnalysisOutput {
  return 'issues' in analysis;
}

export function isFailedJsTsAnalysisOutput(
  analysis: AnalysisOutput,
): analysis is FailedJsTsAnalysisOutput {
  return 'ruleId' in analysis && analysis.ruleId === 'S2260';
}

/**
 * A JavaScript / TypeScript analysis output
 */
export interface FailedJsTsAnalysisOutput extends AnalysisOutput {
  language: JsTsLanguage;
  ruleId: 'S2260';
  line?: number;
  message: string;
}

export interface JsTsAnalysisOutputWithAst extends SuccessfulJsTsAnalysisOutput {
  ast: Uint8Array;
}

export type JsTsAnalysisOutput = FailedJsTsAnalysisOutput | SuccessfulJsTsAnalysisOutput;

/**
 * In SonarQube context, an analysis input includes both path and content of a file
 * to analyze. However, in SonarLint, we might only get the file path. As a result,
 * we read the file if the content is missing in the input.
 */
export function fillLanguage(
  input: Omit<JsTsAnalysisInput, 'fileContent'> & { fileContent: string },
): CompleteJsTsAnalysisInput {
  if (isCompleteJsTsAnalysisInput(input)) {
    return input;
  }
  if (isTsFile(input.filePath, input.fileContent)) {
    return {
      ...input,
      language: 'ts',
    };
  } else if (isJsFile(input.filePath)) {
    return {
      ...input,
      language: 'js',
    };
  }
  throw new Error(`Unable to find language for file ${input.filePath}`);
}

export function isCompleteJsTsAnalysisInput<T extends AnalysisInput>(
  input: T,
): input is T & { language: string } {
  return 'language' in input;
}
