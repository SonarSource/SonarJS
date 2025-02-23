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
import { AnalysisOutput } from '../../shared/src/types/analysis.js';
import { ProjectAnalysisInput } from '../../jsts/src/analysis/projectAnalysis/projectAnalysis.js';
import { TsConfigJson } from 'type-fest';
import { RuleConfig } from '../../jsts/src/linter/config/rule-config.js';
import { APIError, ErrorCode } from '../../shared/src/errors/error.js';
import { NamedDependency } from '../../jsts/src/rules/index.js';
import { CssAnalysisInput } from '../../css/src/analysis/analysis.js';
import { JsTsAnalysisInput } from '../../jsts/src/analysis/analysis.js';
import { EmbeddedAnalysisInput } from '../../jsts/src/embedded/analysis/analysis.js';

export type RequestResult =
  | {
      type: 'success';
      result: string | AnalysisOutput | Telemetry;
    }
  | {
      type: 'failure';
      error: ReturnType<typeof serializeError>;
    };

export type Telemetry = {
  dependencies: NamedDependency[];
};

export type RequestType = BridgeRequest['type'];

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
  | TsConfigFilesRequest
  | GetTelemetryRequest;

type CssRequest = {
  type: 'on-analyze-css';
  data: CssAnalysisInput;
};

type EmbeddedRequest = {
  type: 'on-analyze-html' | 'on-analyze-yaml';
  data: EmbeddedAnalysisInput;
};

type JsTsRequest = {
  type: 'on-analyze-jsts';
  data: JsTsAnalysisInput;
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
    rules: RuleConfig[];
    environments: string[];
    globals: string[];
    baseDir: string;
    sonarlint: boolean;
    bundles: string[];
    rulesWorkdir: string;
  };
};
type NewTsConfigRequest = {
  type: 'on-new-tsconfig';
};
type TsConfigFilesRequest = {
  type: 'on-tsconfig-files';
  data: { tsConfig: string };
};
type GetTelemetryRequest = {
  type: 'on-get-telemetry';
};

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
