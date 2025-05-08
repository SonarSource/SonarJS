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
import { JsTsAnalysisInput, JsTsAnalysisOutput, JsTsAnalysisOutputWithAst } from '../analysis.js';
import { RuleConfig } from '../../linter/config/rule-config.js';
import { EmbeddedAnalysisOutput } from '../../embedded/analysis/analysis.js';
import { ErrorCode } from '../../../../shared/src/errors/error.js';
import { Configuration } from 'shared/src/helpers/configuration.js';

export type ProjectAnalysisOutput = {
  files: { [key: string]: FileResult };
  meta?: {
    withProgram: boolean;
    withWatchProgram: boolean;
    filesWithoutTypeChecking: string[];
    programsCreated: string[];
  };
};

export type FileResult =
  | JsTsAnalysisOutput
  | JsTsAnalysisOutputWithAst
  | EmbeddedAnalysisOutput
  | ParsingError
  | { error: string };

export type ParsingError = {
  parsingError: {
    message: string;
    code: ErrorCode;
    line?: number;
  };
};

export type JsTsFiles = { [key: string]: JsTsAnalysisInput };

export type ProjectAnalysisInput = {
  files?: JsTsFiles;
  rules: RuleConfig[];
  configuration?: Configuration;
  baseDir: string;
  bundles?: string[];
  rulesWorkdir?: string;
};
