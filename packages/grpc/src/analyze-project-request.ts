/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */

import { type ErrorData, APIError, ErrorCode } from '../../analysis/src/contracts/error.js';
import type { ProjectAnalysisOutput } from '../../analysis/src/projectAnalysis.js';
import type { WsIncrementalResult } from '../../analysis/src/incremental-result.js';
import type { sonarjs } from './proto/analyze-project.js';
export type { WsIncrementalResult } from '../../analysis/src/incremental-result.js';

export type AnalyzeProjectProtoRequest = sonarjs.analyzeproject.v1.IAnalyzeProjectRequest;
export type AnalyzeProjectPathMap = Map<string, string>;
export type AnalyzeProjectResponse = {
  output: ProjectAnalysisOutput;
  pathMap: AnalyzeProjectPathMap;
};
export type AnalyzeProjectIncrementalEvent = {
  event: WsIncrementalResult;
  pathMap: AnalyzeProjectPathMap;
};

export type RequestResult<T = void> =
  | {
      type: 'success';
      result: T;
    }
  | {
      type: 'failure';
      error: SerializedError;
      reason: 'invalid_request' | 'runtime';
    };

export type AnalyzeProjectRuntimeRequest = ProjectAnalysisRequest | CancellationRequest;

type ProjectAnalysisRequest = {
  type: 'on-analyze-project';
  data: AnalyzeProjectProtoRequest;
};

type CancellationRequest = {
  type: 'on-cancel-analysis';
};

type SerializedError = {
  code: ErrorCode;
  message: string;
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
    return { code: ErrorCode.Unexpected, message: serializeUnknownErrorMessage(err) };
  }
}

function serializeUnknownErrorMessage(err: unknown): string {
  if (typeof err === 'string') {
    return err;
  }

  try {
    const json = JSON.stringify(err);
    if (json !== undefined) {
      return json;
    }
  } catch {
    // Fall through to String(err).
  }

  return String(err);
}
