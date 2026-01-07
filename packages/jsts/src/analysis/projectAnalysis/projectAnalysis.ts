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
import type {
  JsTsAnalysisInput,
  JsTsAnalysisOutput,
  JsTsAnalysisOutputWithAst,
} from '../analysis.js';
import type { RuleConfig } from '../../linter/config/rule-config.js';
import type { EmbeddedAnalysisOutput } from '../../embedded/analysis/analysis.js';
import type { ErrorCode } from '../../../../shared/src/errors/error.js';
import type { Configuration } from '../../../../shared/src/helpers/configuration.js';

export type ProjectAnalysisMeta = {
  warnings: string[];
};

export type ProjectAnalysisOutput = {
  files: { [key: string]: FileResult };
  meta: ProjectAnalysisMeta;
};

export type FileResult =
  | JsTsAnalysisOutput
  | JsTsAnalysisOutputWithAst
  | EmbeddedAnalysisOutput
  | ParsingError
  | { error: string };

type ParsingError = {
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
  bundles?: string[];
  rulesWorkdir?: string;
};
