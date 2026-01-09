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
import { analyzeFileHandler } from './service.js';
import { healthCheckHandler } from './health-service.js';
import { info, error as logError } from '../../shared/src/helpers/logging.js';

const ANALYZER_SERVICE_NAME = 'analyzer.LanguageAnalyzerService';
const HEALTH_SERVICE_NAME = 'grpc.health.v1.Health';

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
 * Create and start the gRPC server
 */
export function createGrpcServer(): grpc.Server {
  const server = new grpc.Server();

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
        info(`Services: ${ANALYZER_SERVICE_NAME}, ${HEALTH_SERVICE_NAME}`);
        resolve(server);
      },
    );
  });
}
