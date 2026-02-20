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
import type { AnalysisOutput } from '../../shared/src/types/analysis.js';
import type {
  FileResult,
  ProjectAnalysisMeta,
  ProjectAnalysisOutput,
} from '../../jsts/src/analysis/projectAnalysis/projectAnalysis.js';
import { type ErrorData, APIError, ErrorCode } from '../../shared/src/errors/error.js';

export type RequestResult =
  | {
      type: 'success';
      result: string | AnalysisOutput | ProjectAnalysisOutput;
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
  data: unknown;
};

type EmbeddedRequest = {
  type: 'on-analyze-html' | 'on-analyze-yaml';
  data: unknown;
};

type JsTsRequest = {
  type: 'on-analyze-jsts';
  data: unknown;
};

type ProjectAnalysisRequest = {
  type: 'on-analyze-project';
  data: unknown;
};

type CancellationRequest = {
  type: 'on-cancel-analysis';
};

type InitLinterRequest = {
  type: 'on-init-linter';
  data: unknown;
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
