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

import {
  analyzeProject,
  cancelAnalysis,
  withAnalysisCancellation,
} from '../../analysis/src/analyzeProject.js';
import { logHeapStatistics } from './analyze-project-memory.js';
import {
  type AnalyzeProjectIncrementalEvent,
  type AnalyzeProjectProtoRequest,
  type AnalyzeProjectResponse,
  type AnalyzeProjectRuntimeRequest,
  type RequestResult,
  serializeError,
} from './analyze-project-request.js';
import {
  InvalidAnalyzeProjectRequestError,
  normalizeAnalyzeProjectRequest,
} from './analyze-project-normalize.js';
import {
  FS_CACHE_INSTALLATION,
  type FsCacheInstallation,
  type FsCacheSession,
} from '../../shared/src/fs-cache/hook.js';
import { ProgramSelectionArchive } from '../../analysis/src/program-selection/archive.js';
import { ReplayTimings } from '../../analysis/src/program-selection/replay-timings.js';
import { normalizeToAbsolutePath } from '../../shared/src/helpers/files.js';
import { warn } from '../../shared/src/helpers/logging.js';

function beginFilesystemCacheAnalysis(
  request: AnalyzeProjectProtoRequest,
): FsCacheSession | undefined {
  const cache = request.filesystemCache;
  if (cache == null) {
    return undefined;
  }
  if (request.configuration?.sonarlint === true) {
    throw new InvalidAnalyzeProjectRequestError(
      'filesystem_cache must not be configured for SonarQube for IDE analysis',
    );
  }
  if (!cache.archivePath) {
    throw new InvalidAnalyzeProjectRequestError('filesystem_cache.archive_path is required');
  }
  if (!request.configuration?.baseDir) {
    throw new InvalidAnalyzeProjectRequestError('configuration.base_dir is required');
  }

  const installation = (globalThis as Record<symbol, unknown>)[FS_CACHE_INSTALLATION] as
    FsCacheInstallation | undefined;
  if (!installation) {
    throw new InvalidAnalyzeProjectRequestError(
      'filesystem_cache requires an initialized analysis worker',
    );
  }
  return installation.beginAnalysis({
    archivePath: cache.archivePath,
    passthroughDirs: request.rulesWorkdir
      ? [
          normalizeToAbsolutePath(
            request.rulesWorkdir,
            normalizeToAbsolutePath(request.configuration.baseDir),
          ),
        ]
      : [],
    rootDir: request.configuration.baseDir,
  });
}

function beginProgramSelectionAnalysis(
  request: AnalyzeProjectProtoRequest,
): ProgramSelectionArchive | undefined {
  const programSelectionPath = request.filesystemCache?.programSelectionPath;
  if (!programSelectionPath) {
    return undefined;
  }
  const baseDir = request.configuration?.baseDir;
  if (!baseDir) {
    throw new InvalidAnalyzeProjectRequestError('configuration.base_dir is required');
  }
  return new ProgramSelectionArchive(programSelectionPath, normalizeToAbsolutePath(baseDir));
}

function endAnalysisSessions(
  programSelection: ProgramSelectionArchive | undefined,
  filesystemCacheSession: FsCacheSession | undefined,
): void {
  try {
    programSelection?.end();
  } catch (error) {
    warn(`Could not persist the TypeScript program selection archive: ${error}`);
  } finally {
    filesystemCacheSession?.end();
  }
}

export type WorkerData = {
  debugMemory: boolean;
};

export async function handleAnalyzeProjectRequest(
  request: AnalyzeProjectRuntimeRequest,
  workerData: WorkerData,
  incrementalResultsChannel?: (result: AnalyzeProjectIncrementalEvent) => void,
  requestId = 'unknown',
): Promise<RequestResult<AnalyzeProjectResponse | void>> {
  const timings =
    request.type === 'on-analyze-project' && request.data.filesystemCache
      ? new ReplayTimings()
      : undefined;
  let cacheMode: 'record' | 'replay' = 'record';
  let outcome: 'success' | 'failure' = 'failure';
  try {
    switch (request.type) {
      case 'on-analyze-project': {
        const filesystemCacheSession = timings
          ? timings.measure('filesystemArchiveLoad', () =>
              beginFilesystemCacheAnalysis(request.data),
            )
          : beginFilesystemCacheAnalysis(request.data);
        cacheMode = filesystemCacheSession?.mode ?? cacheMode;
        let programSelection: ProgramSelectionArchive | undefined;
        try {
          programSelection = timings
            ? timings.measure('programSelectionLoad', () =>
                beginProgramSelectionAnalysis(request.data),
              )
            : beginProgramSelectionAnalysis(request.data);
          return await withAnalysisCancellation(async () => {
            logHeapStatistics(workerData?.debugMemory);
            const sanitizedInput = timings
              ? await timings.measureAsync('requestNormalization', () =>
                  normalizeAnalyzeProjectRequest(request.data),
                )
              : await normalizeAnalyzeProjectRequest(request.data);
            const wrappedIncrementalResultsChannel = incrementalResultsChannel
              ? (event: AnalyzeProjectIncrementalEvent['event']) =>
                  incrementalResultsChannel({
                    event,
                    pathMap: sanitizedInput.pathMap,
                  })
              : undefined;

            const analyze = () =>
              analyzeProject(
                {
                  rules: sanitizedInput.rules,
                  cssRules: sanitizedInput.cssRules,
                  bundles: sanitizedInput.bundles,
                  rulesWorkdir: sanitizedInput.rulesWorkdir,
                  programSelection,
                  // Per-file measurements are useful for SQAA replay, but avoid that work
                  // during the potentially much larger normal CI recording analysis.
                  replayTimings: programSelection?.isReplay() ? timings : undefined,
                },
                sanitizedInput.configuration,
                wrappedIncrementalResultsChannel,
              );
            const output = timings
              ? await timings.measureAsync('projectAnalysis', analyze)
              : await analyze();
            logHeapStatistics(workerData?.debugMemory);
            outcome = 'success';
            return {
              type: 'success',
              result: {
                output,
                pathMap: sanitizedInput.pathMap,
              },
            };
          });
        } finally {
          endAnalysisSessions(programSelection, filesystemCacheSession);
        }
      }
      case 'on-cancel-analysis': {
        return cancelAnalysis()
          ? { type: 'success', result: undefined }
          : {
              type: 'failure',
              error: serializeError(new Error('No analysis to cancel')),
              reason: 'runtime',
            };
      }
      default: {
        // Handle unknown request types
        const unknownType = (request as { type: unknown }).type;
        return {
          type: 'failure',
          error: serializeError(new Error(`Unknown request type: ${unknownType}`)),
          reason: 'runtime',
        };
      }
    }
  } catch (err) {
    outcome = 'failure';
    return {
      type: 'failure',
      error: serializeError(err),
      reason: err instanceof InvalidAnalyzeProjectRequestError ? 'invalid_request' : 'runtime',
    };
  } finally {
    timings?.log(requestId, outcome, cacheMode);
  }
}
