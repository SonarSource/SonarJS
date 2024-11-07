/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { AnalysisOutput } from '../../shared/src/types/analysis.js';
import { CssAnalysisInput } from '../../css/src/analysis/analysis.js';
import { EmbeddedAnalysisInput } from '../../jsts/src/embedded/analysis/analysis.js';
import { JsTsAnalysisInput } from '../../jsts/src/analysis/analysis.js';
import { ProjectAnalysisInput } from '../../jsts/src/analysis/projectAnalysis/projectAnalysis.js';
import { TsConfigJson } from 'type-fest';
import { RuleConfig } from '../../jsts/src/linter/config/rule-config.js';
import { readFile } from '../../shared/src/helpers/files.js';
import { APIError, ErrorCode } from '../../shared/src/errors/error.js';

export type RequestResult =
  | {
      type: 'success';
      result: string | AnalysisOutput;
    }
  | {
      type: 'failure';
      error: ReturnType<typeof serializeError>;
    };

export type RequestType = BridgeRequest['type'];

type MaybeIncompleteCssAnalysisInput = Omit<CssAnalysisInput, 'fileContent'> & {
  fileContent?: string;
};
type MaybeIncompleteJsTsAnalysisInput = Omit<JsTsAnalysisInput, 'fileContent'> & {
  fileContent?: string;
};
type MaybeIncompleteEmbeddedAnalysisInput = Omit<EmbeddedAnalysisInput, 'fileContent'> & {
  fileContent?: string;
};

type MaybeIncompleteAnalysisInput =
  | MaybeIncompleteJsTsAnalysisInput
  | MaybeIncompleteCssAnalysisInput
  | MaybeIncompleteEmbeddedAnalysisInput;

export type BridgeRequest =
  | CssRequest
  | JsTsRequest
  | EmbeddedRequest
  | ProjectAnalysisRequest
  | CreateProgramRequest
  | CreateTsConfigFileRequest
  | DeleteProgramRequest
  | InitLinterRequest
  | NewTsConfigRequest
  | TsConfigFilesRequest;

type CssRequest = {
  type: 'on-analyze-css';
  data: MaybeIncompleteCssAnalysisInput;
};

type EmbeddedRequest = {
  type: 'on-analyze-html' | 'on-analyze-yaml';
  data: MaybeIncompleteEmbeddedAnalysisInput;
};

type JsTsRequest = {
  type: 'on-analyze-ts' | 'on-analyze-with-program' | 'on-analyze-js';
  data: MaybeIncompleteJsTsAnalysisInput;
};

type ProjectAnalysisRequest = {
  type: 'on-analyze-project';
  data: ProjectAnalysisInput;
};

type CreateProgramRequest = {
  type: 'on-create-program';
  data: { tsConfig: string };
};

type CreateTsConfigFileRequest = {
  type: 'on-create-tsconfig-file';
  data: TsConfigJson;
};

type DeleteProgramRequest = {
  type: 'on-delete-program';
  data: { programId: string };
};

type InitLinterRequest = {
  type: 'on-init-linter';
  data: {
    linterId: string;
    environments: string[];
    globals: string[];
    baseDir: string;
    rules: RuleConfig[];
  };
};
type NewTsConfigRequest = {
  type: 'on-new-tsconfig';
};
type TsConfigFilesRequest = {
  type: 'on-tsconfig-files';
  data: { tsConfig: string };
};

/**
 * In SonarQube context, an analysis input includes both path and content of a file
 * to analyze. However, in SonarLint, we might only get the file path. As a result,
 * we read the file if the content is missing in the input.
 */
export async function readFileLazily<T extends MaybeIncompleteAnalysisInput>(
  input: T,
): Promise<T & { fileContent: string }> {
  if (!isCompleteAnalysisInput(input)) {
    return {
      ...input,
      fileContent: await readFile(input.filePath),
    };
  }
  return input;
}

export function isCompleteAnalysisInput<T extends MaybeIncompleteAnalysisInput>(
  input: T,
): input is T & { fileContent: string } {
  return 'fileContent' in input;
}

/**
 * The default (de)serialization mechanism of the Worker Thread API cannot be used
 * to (de)serialize Error instances. To address this, we turn those instances into
 * regular JavaScript objects.
 */
export function serializeError(err: any) {
  switch (true) {
    case err instanceof APIError:
      return { code: err.code, message: err.message, stack: err.stack, data: err.data };
    case err instanceof Error:
      return { code: ErrorCode.Unexpected, message: err.message, stack: err.stack };
    default:
      return { code: ErrorCode.Unexpected, message: err };
  }
}
