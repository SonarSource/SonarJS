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
  transformSourceFilesToRawInputFiles,
} from './transformers/request.js';
import { transformProjectOutputToResponse } from './transformers/response.js';
import { analyzeProject } from '../../analysis/src/analyzeProject.js';
import {
  initFileStores,
  sourceFileStore,
  packageJsonStore,
  tsConfigStore,
} from '../../analysis/src/file-stores/index.js';
import { info, error as logError } from '../../shared/src/helpers/logging.js';
import { createConfiguration } from '../../analysis/src/common/configuration.js';
import { ROOT_PATH } from '../../shared/src/helpers/files.js';
import { sanitizeRawInputFiles } from '../../analysis/src/common/input-sanitize.js';
import { clearSourceFileContentCache } from '../../analysis/src/jsts/program/cache/sourceFileCache.js';

/**
 * gRPC requests are independent analyses. Reset all shared caches to avoid
 * leaking data between requests with overlapping file paths.
 */
function resetGrpcCaches() {
  sourceFileStore.clearCache();
  packageJsonStore.clearCache();
  tsConfigStore.clearCache();
  clearSourceFileContentCache();
}

/**
 * gRPC handler for the Analyze RPC
 */
export async function analyzeFileHandler(
  call: grpc.ServerUnaryCall<analyzer.IAnalyzeRequest, analyzer.IAnalyzeResponse>,
  callback: grpc.sendUnaryData<analyzer.IAnalyzeResponse>,
): Promise<void> {
  const request = call.request;

  try {
    info(
      `Received Analyze request (${request.analysisId ?? 'no id'}) with ${request.sourceFiles?.length ?? 0} files`,
    );

    resetGrpcCaches();

    // Create configuration for gRPC context
    // gRPC requests contain all file contents inline - no filesystem access needed
    const configuration = createConfiguration({
      baseDir: ROOT_PATH,
      canAccessFileSystem: false,
      reportNclocForTestFiles: true,
    });

    // Transform, sanitize source files, and initialize file stores
    const rawFiles = transformSourceFilesToRawInputFiles(request.sourceFiles || []);
    const { files: inputFiles, pathMap } = await sanitizeRawInputFiles(rawFiles, configuration);
    await initFileStores(configuration, inputFiles);

    const projectInput = transformRequestToProjectInput(request);

    const projectOutput = await analyzeProject(projectInput, configuration);

    const response = transformProjectOutputToResponse(projectOutput, pathMap);

    info(`Analysis complete: ${response.issues?.length ?? 0} issues found`);
    callback(null, response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logError(`Analyze error: ${errorMessage}`);
    callback({
      code: grpc.status.INTERNAL,
      message: errorMessage,
    });
  }
}
