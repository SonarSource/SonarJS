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

import * as grpc from '@grpc/grpc-js';
import type { RequestResult } from './analyze-project-request.js';
import { sonarjs as analyzeProjectProto } from './proto/analyze-project.js';

const ANALYZE_PROJECT_SERVICE_NAME = 'sonarjs.analyzeproject.v1.AnalyzeProjectService';

export const GRPC_SERVER_OPTIONS: grpc.ServerOptions = {
  'grpc.max_receive_message_length': -1,
  'grpc.max_send_message_length': -1,
};

export type AnalyzeProjectRequest = analyzeProjectProto.analyzeproject.v1.IAnalyzeProjectRequest;
export type AnalyzeProjectStreamResponse =
  analyzeProjectProto.analyzeproject.v1.IAnalyzeProjectStreamResponse;
export type AnalyzeProjectUnaryResponse =
  analyzeProjectProto.analyzeproject.v1.IAnalyzeProjectUnaryResponse;
export type CancelAnalysisRequest = analyzeProjectProto.analyzeproject.v1.ICancelAnalysisRequest;
export type CancelAnalysisResponse = analyzeProjectProto.analyzeproject.v1.ICancelAnalysisResponse;
export type LeaseRequest = analyzeProjectProto.analyzeproject.v1.ILeaseRequest;
export type LeaseResponse = analyzeProjectProto.analyzeproject.v1.ILeaseResponse;

export function createAnalyzeProjectServiceDefinition(): grpc.ServiceDefinition {
  return {
    AnalyzeProject: {
      path: `/${ANALYZE_PROJECT_SERVICE_NAME}/AnalyzeProject`,
      requestStream: false,
      responseStream: true,
      requestSerialize: (value: AnalyzeProjectRequest) =>
        Buffer.from(
          analyzeProjectProto.analyzeproject.v1.AnalyzeProjectRequest.encode(value).finish(),
        ),
      requestDeserialize: (buffer: Buffer) =>
        analyzeProjectProto.analyzeproject.v1.AnalyzeProjectRequest.decode(buffer),
      responseSerialize: (value: AnalyzeProjectStreamResponse) =>
        Buffer.from(
          analyzeProjectProto.analyzeproject.v1.AnalyzeProjectStreamResponse.encode(value).finish(),
        ),
      responseDeserialize: (buffer: Buffer) =>
        analyzeProjectProto.analyzeproject.v1.AnalyzeProjectStreamResponse.decode(buffer),
    },
    AnalyzeProjectUnary: {
      path: `/${ANALYZE_PROJECT_SERVICE_NAME}/AnalyzeProjectUnary`,
      requestStream: false,
      responseStream: false,
      requestSerialize: (value: AnalyzeProjectRequest) =>
        Buffer.from(
          analyzeProjectProto.analyzeproject.v1.AnalyzeProjectRequest.encode(value).finish(),
        ),
      requestDeserialize: (buffer: Buffer) =>
        analyzeProjectProto.analyzeproject.v1.AnalyzeProjectRequest.decode(buffer),
      responseSerialize: (value: AnalyzeProjectUnaryResponse) =>
        Buffer.from(
          analyzeProjectProto.analyzeproject.v1.AnalyzeProjectUnaryResponse.encode(value).finish(),
        ),
      responseDeserialize: (buffer: Buffer) =>
        analyzeProjectProto.analyzeproject.v1.AnalyzeProjectUnaryResponse.decode(buffer),
    },
    CancelAnalysis: {
      path: `/${ANALYZE_PROJECT_SERVICE_NAME}/CancelAnalysis`,
      requestStream: false,
      responseStream: false,
      requestSerialize: (value: CancelAnalysisRequest) =>
        Buffer.from(
          analyzeProjectProto.analyzeproject.v1.CancelAnalysisRequest.encode(value).finish(),
        ),
      requestDeserialize: (buffer: Buffer) =>
        analyzeProjectProto.analyzeproject.v1.CancelAnalysisRequest.decode(buffer),
      responseSerialize: (value: CancelAnalysisResponse) =>
        Buffer.from(
          analyzeProjectProto.analyzeproject.v1.CancelAnalysisResponse.encode(value).finish(),
        ),
      responseDeserialize: (buffer: Buffer) =>
        analyzeProjectProto.analyzeproject.v1.CancelAnalysisResponse.decode(buffer),
    },
    Lease: {
      path: `/${ANALYZE_PROJECT_SERVICE_NAME}/Lease`,
      requestStream: true,
      responseStream: true,
      requestSerialize: (value: LeaseRequest) =>
        Buffer.from(analyzeProjectProto.analyzeproject.v1.LeaseRequest.encode(value).finish()),
      requestDeserialize: (buffer: Buffer) =>
        analyzeProjectProto.analyzeproject.v1.LeaseRequest.decode(buffer),
      responseSerialize: (value: LeaseResponse) =>
        Buffer.from(analyzeProjectProto.analyzeproject.v1.LeaseResponse.encode(value).finish()),
      responseDeserialize: (buffer: Buffer) =>
        analyzeProjectProto.analyzeproject.v1.LeaseResponse.decode(buffer),
    },
  };
}

export function toGrpcError(message: string, code = grpc.status.INTERNAL): grpc.ServiceError {
  const error = new Error(message) as grpc.ServiceError;
  error.name = 'AnalyzeProjectServiceError';
  error.code = code;
  error.details = message;
  error.metadata = new grpc.Metadata();
  return error;
}

export function failStreamingCall(
  call:
    | grpc.ServerWritableStream<AnalyzeProjectRequest, AnalyzeProjectStreamResponse>
    | grpc.ServerDuplexStream<LeaseRequest, LeaseResponse>,
  error: grpc.ServiceError,
) {
  call.emit('error', error);
}

export function toGrpcErrorFromFailure(result: Extract<RequestResult, { type: 'failure' }>) {
  return toGrpcError(
    result.error.message,
    result.reason === 'invalid_request' ? grpc.status.INVALID_ARGUMENT : grpc.status.INTERNAL,
  );
}
