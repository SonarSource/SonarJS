/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { JsTsLanguage } from '../../../shared/src/helpers/language.js';
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
  tsConfigs?: string[];
  programId?: string;
  skipAst?: boolean;
}

export interface ParsingError {
  message: string;
  line?: number;
  code: ErrorCode;
}

/**
 * A JavaScript / TypeScript analysis output
 */
export interface JsTsAnalysisOutput extends AnalysisOutput {
  parsingError?: ParsingError;
  issues: Issue[];
  highlights?: SyntaxHighlight[];
  highlightedSymbols?: SymbolHighlight[];
  metrics?: Metrics;
  cpdTokens?: CpdToken[];
  ucfgPaths?: string[];
  ast?: Uint8Array;
}

export interface JsTsAnalysisOutputWithAst extends JsTsAnalysisOutput {
  ast: Uint8Array;
}
