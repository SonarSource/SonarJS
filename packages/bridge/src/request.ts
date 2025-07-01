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
import type { AnalysisOutput } from '../../shared/src/types/analysis.js';
import type {
  FileResult,
  ProjectAnalysisInput,
  ProjectAnalysisMeta,
} from '../../jsts/src/analysis/projectAnalysis/projectAnalysis.js';
import type { RuleConfig } from '../../jsts/src/linter/config/rule-config.js';
import { APIError, ErrorCode, ErrorData } from '../../shared/src/errors/error.js';
import type { CssAnalysisInput } from '../../css/src/analysis/analysis.js';
import type { JsTsAnalysisInput } from '../../jsts/src/analysis/analysis.js';
import type { EmbeddedAnalysisInput } from '../../jsts/src/embedded/analysis/analysis.js';

export type RequestResult =
  | {
      type: 'success';
      result: string | AnalysisOutput;
    }
  | {
      type: 'failure';
      error: SerializedError;
    };

type WsAnalysisCancelled = { messageType: 'cancelled' };
type WsMetaResult = { messageType: 'meta' } & ProjectAnalysisMeta;
type WsFileResult = { filename: string; messageType: 'fileResult' } & FileResult;
type WsError = { messageType: 'error'; error: unknown };
export type WsIncrementalResult = WsFileResult | WsMetaResult | WsAnalysisCancelled | WsError;

export type RequestType = BridgeRequest['type'];

export type BridgeRequest =
  | CssRequest
  | JsTsRequest
  | EmbeddedRequest
  | ProjectAnalysisRequest
  | CancellationRequest
  | InitLinterRequest;

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

type CancellationRequest = {
  type: 'on-cancel-analysis';
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

type SerializedError = {
  code: ErrorCode;
  message: unknown;
  stack?: string;
  data?: ErrorData;
};

/**
 * The default (de)serialization mechanism of the Worker Thread API cannot be used
 * to (de)serialize Error instances. To address this, we turn those instances into
 * regular JavaScript objects.
 */
export function serializeError(err: unknown): SerializedError {
  if (err instanceof APIError) {
    return { code: err.code, message: err.message, stack: err.stack, data: err.data };
  } else if (err instanceof Error) {
    return { code: ErrorCode.Unexpected, message: err.message, stack: err.stack };
  } else {
    return { code: ErrorCode.Unexpected, message: err };
  }
}
