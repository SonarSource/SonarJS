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
import * as grpc from '@grpc/grpc-js';
import { analyzer } from './proto/language_analyzer.js';
import { grpc as healthProto } from './proto/health.js';
import { bridge } from './proto/bridge.js';
import { analyzeFileHandler } from './service.js';
import { healthCheckHandler } from './health-service.js';
import {
  initLinterHandler,
  analyzeJsTsHandler,
  analyzeCssHandler,
  analyzeYamlHandler,
  analyzeHtmlHandler,
  analyzeProjectHandler,
  cancelAnalysisHandler,
  closeHandler,
} from './bridge-service.js';
import { info, error as logError } from '../../shared/src/helpers/logging.js';

const ANALYZER_SERVICE_NAME = 'analyzer.LanguageAnalyzerService';
const HEALTH_SERVICE_NAME = 'grpc.health.v1.Health';
const BRIDGE_SERVICE_NAME = 'bridge.BridgeService';

// Max message size for large files (100MB)
const MAX_MESSAGE_SIZE = 100 * 1024 * 1024;

/**
 * Create gRPC service definition for LanguageAnalyzerService
 */
function createAnalyzerServiceDefinition(): grpc.ServiceDefinition {
  return {
    Analyze: {
      path: `/${ANALYZER_SERVICE_NAME}/Analyze`,
      requestStream: false,
      responseStream: false,
      requestSerialize: (value: analyzer.IAnalyzeRequest) =>
        Buffer.from(analyzer.AnalyzeRequest.encode(value).finish()),
      requestDeserialize: (buffer: Buffer) => analyzer.AnalyzeRequest.decode(buffer),
      responseSerialize: (value: analyzer.IAnalyzeResponse) =>
        Buffer.from(analyzer.AnalyzeResponse.encode(value).finish()),
      responseDeserialize: (buffer: Buffer) => analyzer.AnalyzeResponse.decode(buffer),
    },
  };
}

/**
 * Create gRPC service definition for Health service
 */
function createHealthServiceDefinition(): grpc.ServiceDefinition {
  return {
    Check: {
      path: `/${HEALTH_SERVICE_NAME}/Check`,
      requestStream: false,
      responseStream: false,
      requestSerialize: (value: healthProto.health.v1.IHealthCheckRequest) =>
        Buffer.from(healthProto.health.v1.HealthCheckRequest.encode(value).finish()),
      requestDeserialize: (buffer: Buffer) =>
        healthProto.health.v1.HealthCheckRequest.decode(buffer),
      responseSerialize: (value: healthProto.health.v1.IHealthCheckResponse) =>
        Buffer.from(healthProto.health.v1.HealthCheckResponse.encode(value).finish()),
      responseDeserialize: (buffer: Buffer) =>
        healthProto.health.v1.HealthCheckResponse.decode(buffer),
    },
  };
}

/**
 * Create gRPC service definition for BridgeService
 */
function createBridgeServiceDefinition(): grpc.ServiceDefinition {
  return {
    InitLinter: {
      path: `/${BRIDGE_SERVICE_NAME}/InitLinter`,
      requestStream: false,
      responseStream: false,
      requestSerialize: (value: bridge.IInitLinterRequest) =>
        Buffer.from(bridge.InitLinterRequest.encode(value).finish()),
      requestDeserialize: (buffer: Buffer) => bridge.InitLinterRequest.decode(buffer),
      responseSerialize: (value: bridge.IInitLinterResponse) =>
        Buffer.from(bridge.InitLinterResponse.encode(value).finish()),
      responseDeserialize: (buffer: Buffer) => bridge.InitLinterResponse.decode(buffer),
    },
    AnalyzeJsTs: {
      path: `/${BRIDGE_SERVICE_NAME}/AnalyzeJsTs`,
      requestStream: false,
      responseStream: false,
      requestSerialize: (value: bridge.IAnalyzeJsTsRequest) =>
        Buffer.from(bridge.AnalyzeJsTsRequest.encode(value).finish()),
      requestDeserialize: (buffer: Buffer) => bridge.AnalyzeJsTsRequest.decode(buffer),
      responseSerialize: (value: bridge.IAnalyzeJsTsResponse) =>
        Buffer.from(bridge.AnalyzeJsTsResponse.encode(value).finish()),
      responseDeserialize: (buffer: Buffer) => bridge.AnalyzeJsTsResponse.decode(buffer),
    },
    AnalyzeCss: {
      path: `/${BRIDGE_SERVICE_NAME}/AnalyzeCss`,
      requestStream: false,
      responseStream: false,
      requestSerialize: (value: bridge.IAnalyzeCssRequest) =>
        Buffer.from(bridge.AnalyzeCssRequest.encode(value).finish()),
      requestDeserialize: (buffer: Buffer) => bridge.AnalyzeCssRequest.decode(buffer),
      responseSerialize: (value: bridge.IAnalyzeCssResponse) =>
        Buffer.from(bridge.AnalyzeCssResponse.encode(value).finish()),
      responseDeserialize: (buffer: Buffer) => bridge.AnalyzeCssResponse.decode(buffer),
    },
    AnalyzeYaml: {
      path: `/${BRIDGE_SERVICE_NAME}/AnalyzeYaml`,
      requestStream: false,
      responseStream: false,
      requestSerialize: (value: bridge.IAnalyzeYamlRequest) =>
        Buffer.from(bridge.AnalyzeYamlRequest.encode(value).finish()),
      requestDeserialize: (buffer: Buffer) => bridge.AnalyzeYamlRequest.decode(buffer),
      responseSerialize: (value: bridge.IAnalyzeYamlResponse) =>
        Buffer.from(bridge.AnalyzeYamlResponse.encode(value).finish()),
      responseDeserialize: (buffer: Buffer) => bridge.AnalyzeYamlResponse.decode(buffer),
    },
    AnalyzeHtml: {
      path: `/${BRIDGE_SERVICE_NAME}/AnalyzeHtml`,
      requestStream: false,
      responseStream: false,
      requestSerialize: (value: bridge.IAnalyzeHtmlRequest) =>
        Buffer.from(bridge.AnalyzeHtmlRequest.encode(value).finish()),
      requestDeserialize: (buffer: Buffer) => bridge.AnalyzeHtmlRequest.decode(buffer),
      responseSerialize: (value: bridge.IAnalyzeHtmlResponse) =>
        Buffer.from(bridge.AnalyzeHtmlResponse.encode(value).finish()),
      responseDeserialize: (buffer: Buffer) => bridge.AnalyzeHtmlResponse.decode(buffer),
    },
    AnalyzeProject: {
      path: `/${BRIDGE_SERVICE_NAME}/AnalyzeProject`,
      requestStream: false,
      responseStream: true, // Server streaming RPC
      requestSerialize: (value: bridge.IAnalyzeProjectRequest) =>
        Buffer.from(bridge.AnalyzeProjectRequest.encode(value).finish()),
      requestDeserialize: (buffer: Buffer) => bridge.AnalyzeProjectRequest.decode(buffer),
      responseSerialize: (value: bridge.IAnalyzeProjectResponse) =>
        Buffer.from(bridge.AnalyzeProjectResponse.encode(value).finish()),
      responseDeserialize: (buffer: Buffer) => bridge.AnalyzeProjectResponse.decode(buffer),
    },
    CancelAnalysis: {
      path: `/${BRIDGE_SERVICE_NAME}/CancelAnalysis`,
      requestStream: false,
      responseStream: false,
      requestSerialize: (value: bridge.ICancelAnalysisRequest) =>
        Buffer.from(bridge.CancelAnalysisRequest.encode(value).finish()),
      requestDeserialize: (buffer: Buffer) => bridge.CancelAnalysisRequest.decode(buffer),
      responseSerialize: (value: bridge.ICancelAnalysisResponse) =>
        Buffer.from(bridge.CancelAnalysisResponse.encode(value).finish()),
      responseDeserialize: (buffer: Buffer) => bridge.CancelAnalysisResponse.decode(buffer),
    },
    Close: {
      path: `/${BRIDGE_SERVICE_NAME}/Close`,
      requestStream: false,
      responseStream: false,
      requestSerialize: (value: bridge.ICloseRequest) =>
        Buffer.from(bridge.CloseRequest.encode(value).finish()),
      requestDeserialize: (buffer: Buffer) => bridge.CloseRequest.decode(buffer),
      responseSerialize: (value: bridge.ICloseResponse) =>
        Buffer.from(bridge.CloseResponse.encode(value).finish()),
      responseDeserialize: (buffer: Buffer) => bridge.CloseResponse.decode(buffer),
    },
  };
}

/**
 * Create and start the gRPC server
 */
export function createGrpcServer(): grpc.Server {
  const server = new grpc.Server({
    'grpc.max_receive_message_length': MAX_MESSAGE_SIZE,
    'grpc.max_send_message_length': MAX_MESSAGE_SIZE,
  });

  // Register LanguageAnalyzerService (for A3S)
  const analyzerServiceDefinition = createAnalyzerServiceDefinition();
  const analyzerImplementation: grpc.UntypedServiceImplementation = {
    Analyze: (
      call: grpc.ServerUnaryCall<analyzer.IAnalyzeRequest, analyzer.IAnalyzeResponse>,
      callback: grpc.sendUnaryData<analyzer.IAnalyzeResponse>,
    ) => {
      analyzeFileHandler(call, callback);
    },
  };
  server.addService(analyzerServiceDefinition, analyzerImplementation);

  // Register Health service
  const healthServiceDefinition = createHealthServiceDefinition();
  const healthImplementation: grpc.UntypedServiceImplementation = {
    Check: (
      call: grpc.ServerUnaryCall<
        healthProto.health.v1.IHealthCheckRequest,
        healthProto.health.v1.IHealthCheckResponse
      >,
      callback: grpc.sendUnaryData<healthProto.health.v1.IHealthCheckResponse>,
    ) => {
      healthCheckHandler(call, callback);
    },
  };
  server.addService(healthServiceDefinition, healthImplementation);

  // Register BridgeService (for Java plugin)
  const bridgeServiceDefinition = createBridgeServiceDefinition();
  const bridgeImplementation: grpc.UntypedServiceImplementation = {
    InitLinter: (
      call: grpc.ServerUnaryCall<bridge.IInitLinterRequest, bridge.IInitLinterResponse>,
      callback: grpc.sendUnaryData<bridge.IInitLinterResponse>,
    ) => {
      initLinterHandler(call, callback);
    },
    AnalyzeJsTs: (
      call: grpc.ServerUnaryCall<bridge.IAnalyzeJsTsRequest, bridge.IAnalyzeJsTsResponse>,
      callback: grpc.sendUnaryData<bridge.IAnalyzeJsTsResponse>,
    ) => {
      analyzeJsTsHandler(call, callback);
    },
    AnalyzeCss: (
      call: grpc.ServerUnaryCall<bridge.IAnalyzeCssRequest, bridge.IAnalyzeCssResponse>,
      callback: grpc.sendUnaryData<bridge.IAnalyzeCssResponse>,
    ) => {
      analyzeCssHandler(call, callback);
    },
    AnalyzeYaml: (
      call: grpc.ServerUnaryCall<bridge.IAnalyzeYamlRequest, bridge.IAnalyzeYamlResponse>,
      callback: grpc.sendUnaryData<bridge.IAnalyzeYamlResponse>,
    ) => {
      analyzeYamlHandler(call, callback);
    },
    AnalyzeHtml: (
      call: grpc.ServerUnaryCall<bridge.IAnalyzeHtmlRequest, bridge.IAnalyzeHtmlResponse>,
      callback: grpc.sendUnaryData<bridge.IAnalyzeHtmlResponse>,
    ) => {
      analyzeHtmlHandler(call, callback);
    },
    AnalyzeProject: (
      call: grpc.ServerWritableStream<
        bridge.IAnalyzeProjectRequest,
        bridge.IAnalyzeProjectResponse
      >,
    ) => {
      analyzeProjectHandler(call);
    },
    CancelAnalysis: (
      call: grpc.ServerUnaryCall<bridge.ICancelAnalysisRequest, bridge.ICancelAnalysisResponse>,
      callback: grpc.sendUnaryData<bridge.ICancelAnalysisResponse>,
    ) => {
      cancelAnalysisHandler(call, callback);
    },
    Close: (
      call: grpc.ServerUnaryCall<bridge.ICloseRequest, bridge.ICloseResponse>,
      callback: grpc.sendUnaryData<bridge.ICloseResponse>,
    ) => {
      closeHandler(call, callback);
    },
  };
  server.addService(bridgeServiceDefinition, bridgeImplementation);

  return server;
}

/**
 * Start the gRPC server on the specified port
 */
export function startServer(port: number): Promise<grpc.Server> {
  return new Promise((resolve, reject) => {
    const server = createGrpcServer();

    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (error, boundPort) => {
        if (error) {
          logError(`Failed to bind gRPC server: ${error.message}`);
          reject(error);
          return;
        }

        info(`gRPC server listening on port ${boundPort}`);
        info(`Services: ${ANALYZER_SERVICE_NAME}, ${HEALTH_SERVICE_NAME}, ${BRIDGE_SERVICE_NAME}`);
        resolve(server);
      },
    );
  });
}
