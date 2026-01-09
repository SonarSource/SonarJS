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
import { grpc as healthProto } from './proto/health.js';
import { info } from '../../shared/src/helpers/logging.js';

/**
 * gRPC handler for the Health Check RPC
 * Implements the standard grpc.health.v1.Health service
 */
export async function healthCheckHandler(
  call: grpc.ServerUnaryCall<
    healthProto.health.v1.IHealthCheckRequest,
    healthProto.health.v1.IHealthCheckResponse
  >,
  callback: grpc.sendUnaryData<healthProto.health.v1.IHealthCheckResponse>,
): Promise<void> {
  const request = call.request;
  const serviceName = request.service || '';

  info(`Health check request for service: "${serviceName}"`);

  const isKnownService = serviceName === '' || serviceName === 'analyzer.LanguageAnalyzerService';

  if (!isKnownService) {
    info(`Unknown service requested: "${serviceName}"`);
    callback({
      code: grpc.status.NOT_FOUND,
      message: `Service "${serviceName}" not found`,
    });
    return;
  }

  const response: healthProto.health.v1.IHealthCheckResponse = {
    status: healthProto.health.v1.HealthCheckResponse.ServingStatus.SERVING,
  };

  callback(null, response);
}
