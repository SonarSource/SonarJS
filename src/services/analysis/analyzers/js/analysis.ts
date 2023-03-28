/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { FileType } from 'helpers';
import { CpdToken, Issue, Metrics, SymbolHighlight, SyntaxHighlight } from 'linting/eslint';
import { AnalysisInput, AnalysisOutput } from 'services/analysis';
import { Perf } from 'services/monitoring';

/**
 * A partial JavaScript / TypeScript analysis input
 *
 * _A common interface for both TSConfig-based and Program-based analysis inputs._
 *
 * @param fileType the file type to select the proper linting configuration
 * @param ignoreHeaderComments a flag used by some rules to ignore header comments
 */
interface PartialJsTsAnalysisInput extends AnalysisInput {
  fileType: FileType;
  ignoreHeaderComments?: boolean;
}

/**
 * A TSConfig-based analysis input for JavaScript / TypeScript
 *
 * A TSConfig-based analysis relies on an automatically created TypeScript Program's
 * instance by TypeScript ESLint parser, which leaves to it the lifecycle of such an
 * instance.
 *
 * The JavaScript analyzer performs TSConfig-based analysis for JavaScript, which can
 * benefit from available type information and improve the precision of some rules.
 *
 * @param tsConfigs a list of TSConfigs
 */
export interface TSConfigBasedAnalysisInput extends PartialJsTsAnalysisInput {
  tsConfigs: string[];
  createProgram?: boolean;
}

/**
 * A program-based analysis input for JavaScript / TypeScript
 *
 * A program-based analysis relies on a manually created TypeScript Program's
 * instance based on a TSConfig to control the lifecycle of the main internal
 * data structure used by TypeScript ESLint parser for performance reasons.
 *
 * The JavaScript analyzer performs program-based analysis for TypeScript.
 *
 * @param programId the identifier of a TypeScript Program's instance
 */
export interface ProgramBasedAnalysisInput extends PartialJsTsAnalysisInput {
  programId: string;
}

/**
 * A JavaScript / TypeScript analysis input
 */
export type JsTsAnalysisInput = TSConfigBasedAnalysisInput | ProgramBasedAnalysisInput;

/**
 * A JavaScript / TypeScript analysis output
 */
export interface JsTsAnalysisOutput extends AnalysisOutput {
  issues: Issue[];
  highlights?: SyntaxHighlight[];
  highlightedSymbols?: SymbolHighlight[];
  metrics?: Metrics;
  cpdTokens?: CpdToken[];
  perf?: Perf;
  ucfgPaths?: string[];
}
