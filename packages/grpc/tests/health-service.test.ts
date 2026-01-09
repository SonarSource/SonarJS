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
import { describe, it, before, after } from 'node:test';
import { expect } from 'expect';
import * as grpc from '@grpc/grpc-js';
import { grpc as healthProto } from '../src/proto/health.js';
import { createGrpcServer } from '../src/server.js';

const HEALTH_SERVICE_NAME = 'grpc.health.v1.Health';

/**
 * Start a test server on a dynamically assigned port
 */
async function startTestServer(): Promise<{ server: grpc.Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = createGrpcServer();
    server.bindAsync('0.0.0.0:0', grpc.ServerCredentials.createInsecure(), (error, port) => {
      if (error) {
        reject(error);
      } else {
        resolve({ server, port });
      }
    });
  });
}

/**
 * Create a gRPC client for the Health service
 */
function createHealthClient(port: number) {
  const methodDefinition: grpc.MethodDefinition<
    healthProto.health.v1.IHealthCheckRequest,
    healthProto.health.v1.IHealthCheckResponse
  > = {
    path: `/${HEALTH_SERVICE_NAME}/Check`,
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: healthProto.health.v1.IHealthCheckRequest) =>
      Buffer.from(healthProto.health.v1.HealthCheckRequest.encode(value).finish()),
    requestDeserialize: (buffer: Buffer) => healthProto.health.v1.HealthCheckRequest.decode(buffer),
    responseSerialize: (value: healthProto.health.v1.IHealthCheckResponse) =>
      Buffer.from(healthProto.health.v1.HealthCheckResponse.encode(value).finish()),
    responseDeserialize: (buffer: Buffer) =>
      healthProto.health.v1.HealthCheckResponse.decode(buffer),
  };

  const serviceDefinition = {
    Check: methodDefinition,
  } as grpc.ServiceDefinition<grpc.UntypedServiceImplementation>;

  const Client = grpc.makeGenericClientConstructor(serviceDefinition, 'Health');
  const client = new Client(`localhost:${port}`, grpc.credentials.createInsecure());

  return {
    check: (
      request: healthProto.health.v1.IHealthCheckRequest,
    ): Promise<healthProto.health.v1.IHealthCheckResponse> => {
      return new Promise((resolve, reject) => {
        client.makeUnaryRequest(
          `/${HEALTH_SERVICE_NAME}/Check`,
          methodDefinition.requestSerialize,
          methodDefinition.responseDeserialize,
          request,
          (
            error: grpc.ServiceError | null,
            response?: healthProto.health.v1.IHealthCheckResponse,
          ) => {
            if (error) {
              reject(error);
            } else {
              resolve(response!);
            }
          },
        );
      });
    },
    close: () => {
      client.close();
    },
  };
}

describe('Health service', () => {
  let server: grpc.Server;
  let client: ReturnType<typeof createHealthClient>;

  before(async () => {
    const testServer = await startTestServer();
    server = testServer.server;
    client = createHealthClient(testServer.port);
  });

  after(async () => {
    client.close();
    await new Promise<void>((resolve, reject) => {
      server.tryShutdown(err => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  it('should respond SERVING for overall server health (empty service name)', async () => {
    const request: healthProto.health.v1.IHealthCheckRequest = {
      service: '',
    };

    const response = await client.check(request);

    expect(response.status).toBe(healthProto.health.v1.HealthCheckResponse.ServingStatus.SERVING);
  });

  it('should respond SERVING for LanguageAnalyzerService', async () => {
    const request: healthProto.health.v1.IHealthCheckRequest = {
      service: 'analyzer.LanguageAnalyzerService',
    };

    const response = await client.check(request);

    expect(response.status).toBe(healthProto.health.v1.HealthCheckResponse.ServingStatus.SERVING);
  });

  it('should respond NOT_FOUND for unknown service', async () => {
    const request: healthProto.health.v1.IHealthCheckRequest = {
      service: 'unknown.Service',
    };

    try {
      await client.check(request);
      expect(true).toBe(false);
    } catch (error) {
      expect((error as grpc.ServiceError).code).toBe(grpc.status.NOT_FOUND);
      expect((error as grpc.ServiceError).message).toContain('unknown.Service');
    }
  });
});
