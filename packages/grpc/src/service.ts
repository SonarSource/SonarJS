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
import type { analyzer } from './proto/language_analyzer.js';
import {
  transformRequestToProjectInput,
  transformProjectOutputToResponse,
} from './transformers/index.js';
import { analyzeProject } from '../../jsts/src/analysis/projectAnalysis/analyzeProject.js';
import { info, error as logError } from '../../shared/src/helpers/logging.js';

/**
 * gRPC handler for the AnalyzeFile RPC
 */
export async function analyzeFileHandler(
  call: grpc.ServerUnaryCall<analyzer.IAnalyzeFileRequest, analyzer.IAnalyzeFileResponse>,
  callback: grpc.sendUnaryData<analyzer.IAnalyzeFileResponse>,
): Promise<void> {
  const request = call.request;

  try {
    info(`Received AnalyzeFile request with ${request.sourceFiles?.length ?? 0} files`);

    const projectInput = transformRequestToProjectInput(request);

    const projectOutput = await analyzeProject(projectInput);

    const response = transformProjectOutputToResponse(projectOutput);

    info(`Analysis complete: ${response.issues?.length ?? 0} issues found`);
    callback(null, response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logError(`AnalyzeFile error: ${errorMessage}`);
    callback({
      code: grpc.status.INTERNAL,
      message: errorMessage,
    });
  }
}
