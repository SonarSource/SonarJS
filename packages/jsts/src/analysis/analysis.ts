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
import { FileType, type NormalizedAbsolutePath } from '../../../shared/src/helpers/files.js';
import { JsTsLanguage } from '../../../shared/src/helpers/configuration.js';
import { AnalysisInput, AnalysisOutput } from '../../../shared/src/types/analysis.js';
import { SyntaxHighlight } from '../linter/visitors/syntax-highlighting.js';
import { SymbolHighlight } from '../linter/visitors/symbol-highlighting.js';
import { Metrics } from '../linter/visitors/metrics/metrics.js';
import { CpdToken } from '../linter/visitors/cpd.js';
import { Issue } from '../linter/issues/issue.js';
import type { Program } from 'typescript';

/**
 * A sanitized JavaScript / TypeScript analysis input with all required fields populated.
 *
 * This is the internal type used after sanitization. All fields are required
 * because sanitization fills in defaults, reads file content, and infers language.
 *
 * On SonarLint and Vue projects, TSConfig-based analysis relies on an automatically
 * created TypeScript Program's instance by TypeScript ESLint parser, which leaves
 * to it the lifecycle of such an instance.
 *
 * For all other cases, analysis relies on an automatically created TypeScript Program's
 * instance based on a TSConfig to control the lifecycle of the main internal
 * data structure used by TypeScript ESLint parser for performance reasons.
 *
 * @param fileType the file type to select the proper linting configuration (MAIN or TEST)
 * @param fileStatus the file status for incremental analysis (SAME, CHANGED, ADDED)
 * @param language the file language ('js' or 'ts'), inferred from extension if not provided
 * @param analysisMode the analysis mode (DEFAULT or SKIP_UNCHANGED)
 * @param ignoreHeaderComments a flag used by some rules to ignore header comments
 * @param allowTsParserJsFiles whether to use TypeScript parser for JS files
 * @param tsConfigs a list of normalized absolute paths to TSConfig files
 * @param program an optional pre-created TypeScript Program instance
 * @param skipAst whether to skip AST serialization in the output
 * @param clearDependenciesCache whether to clear the dependencies cache before analysis
 */
export interface JsTsAnalysisInput extends AnalysisInput {
  fileType: FileType;
  fileStatus: FileStatus;
  language: JsTsLanguage;
  analysisMode: AnalysisMode;
  ignoreHeaderComments: boolean;
  allowTsParserJsFiles: boolean;
  tsConfigs: NormalizedAbsolutePath[];
  program?: Program;
  skipAst: boolean;
  clearDependenciesCache: boolean;
}

export type AnalysisMode = 'DEFAULT' | 'SKIP_UNCHANGED';
export type FileStatus = 'SAME' | 'CHANGED' | 'ADDED';

/**
 * Default values for JsTsAnalysisInput fields.
 * These are the canonical defaults used throughout the codebase when sanitizing raw inputs.
 *
 * - fileStatus: 'SAME' - assume file unchanged unless told otherwise
 * - analysisMode: 'DEFAULT' - standard analysis mode
 * - ignoreHeaderComments: true - matches sonar.javascript.ignoreHeaderComments default
 * - allowTsParserJsFiles: true - enable TypeScript parser for better JS analysis
 * - sonarlint: false - not running in SonarLint context by default
 * - skipAst: true - skip AST serialization by default for performance
 * - clearDependenciesCache: false - preserve cache by default
 * - fileType: 'MAIN' - assume main source file unless told otherwise
 */
export const JSTS_ANALYSIS_DEFAULTS = {
  fileStatus: 'SAME' as FileStatus,
  analysisMode: 'DEFAULT' as AnalysisMode,
  ignoreHeaderComments: true,
  allowTsParserJsFiles: true,
  sonarlint: false,
  skipAst: true,
  clearDependenciesCache: false,
  fileType: 'MAIN' as FileType,
} as const;

/**
 * A JavaScript / TypeScript analysis output
 */
export interface JsTsAnalysisOutput extends AnalysisOutput {
  issues: Issue[];
  highlights?: SyntaxHighlight[];
  highlightedSymbols?: SymbolHighlight[];
  metrics?: Metrics;
  cpdTokens?: CpdToken[];
}

export interface JsTsAnalysisOutputWithAst extends JsTsAnalysisOutput {
  ast: string; // Base64 encoded Protobuf binary representation
}
