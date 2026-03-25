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
  ProjectAnalysisOutput,
} from '../../analysis/src/projectAnalysis.js';
import type { WsIncrementalResult } from '../../analysis/src/incremental-result.js';
import { type ErrorData, APIError, ErrorCode } from '../../analysis/src/contracts/error.js';

export type RequestResult =
  | {
      type: 'success';
      result: string | ProjectAnalysisOutput;
    }
  | {
      type: 'failure';
      error: SerializedError;
    };

export type { WsIncrementalResult };

export type RequestType = BridgeRequest['type'];

export type BridgeRequest = ProjectAnalysisRequest | CancellationRequest;

type ProjectAnalysisRequest = {
  type: 'on-analyze-project';
  data: unknown;
};

type CancellationRequest = {
  type: 'on-cancel-analysis';
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
