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
import { analyzeFileHandler } from './service.js';
import { info, error as logError } from '../../shared/src/helpers/logging.js';

const SERVICE_NAME = 'analyzer.LanguageAnalyzerService';

/**
 * Create gRPC service definition using static generated protobuf code
 */
function createServiceDefinition(): grpc.ServiceDefinition {
  return {
    AnalyzeFile: {
      path: `/${SERVICE_NAME}/AnalyzeFile`,
      requestStream: false,
      responseStream: false,
      requestSerialize: (value: analyzer.IAnalyzeFileRequest) =>
        Buffer.from(analyzer.AnalyzeFileRequest.encode(value).finish()),
      requestDeserialize: (buffer: Buffer) => analyzer.AnalyzeFileRequest.decode(buffer),
      responseSerialize: (value: analyzer.IAnalyzeFileResponse) =>
        Buffer.from(analyzer.AnalyzeFileResponse.encode(value).finish()),
      responseDeserialize: (buffer: Buffer) => analyzer.AnalyzeFileResponse.decode(buffer),
    },
  };
}

/**
 * Create and start the gRPC server
 */
function createGrpcServer(): grpc.Server {
  const server = new grpc.Server();
  const serviceDefinition = createServiceDefinition();

  // Create the implementation map
  const implementation: grpc.UntypedServiceImplementation = {
    AnalyzeFile: (
      call: grpc.ServerUnaryCall<analyzer.IAnalyzeFileRequest, analyzer.IAnalyzeFileResponse>,
      callback: grpc.sendUnaryData<analyzer.IAnalyzeFileResponse>,
    ) => {
      analyzeFileHandler(call, callback);
    },
  };

  // Add the service to the server
  server.addService(serviceDefinition, implementation);

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
        resolve(server);
      },
    );
  });
}
