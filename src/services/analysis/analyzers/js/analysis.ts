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
import { FileType, JsTsLanguage } from 'helpers';
import { CpdToken, Issue, Metrics, SymbolHighlight, SyntaxHighlight } from 'linting/eslint';
import { AnalysisInput, AnalysisOutput } from 'services/analysis';
import { Perf } from 'services/monitoring';

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
 * @param language the file language ('js' or 'ts')
 * @param ignoreHeaderComments a flag used by some rules to ignore header comments
 * @param tsConfigs a list of TSConfigs
 * @param createProgram force creation of a program
 * @param forceUpdateTSConfigs force reload of tsconfigs on file system
 * @param createWildcardTSConfig used for sonarLint (or vue), when true we will create a tsconfig
 *        including all files from basedir and pass it to typescript-eslint as project
 * @param useFoundTSConfigs used for sonarLint (or vue). When true, all tsconfigs found in the
 *        fs will be passed to typescript-eslint as project.
 * @param limitToBaseDir limit Typescript dependencies lookup to baseDir, i.e. it will not find
 *        node_modules folders in parent directories (used for ruling tests)
 */
export interface JsTsAnalysisInput extends AnalysisInput {
  fileType: FileType;
  language: JsTsLanguage;
  baseDir: string;
  ignoreHeaderComments?: boolean;
  tsConfigs?: string[];
  createProgram?: boolean;
  forceUpdateTSConfigs?: boolean;
  createWildcardTSConfig?: boolean;
  useFoundTSConfigs?: boolean;
  limitToBaseDir?: boolean;
}

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
