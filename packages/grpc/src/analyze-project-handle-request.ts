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
import { filesWithoutRecordedProgramOutcome } from '../../analysis/src/analyzeWithProgram.js';
import { getJsTsConfigFields } from '../../analysis/src/common/configuration.js';
import { sourceFileStore } from '../../analysis/src/file-stores/index.js';
import {
  normalizeToAbsolutePath,
  type NormalizedAbsolutePath,
} from '../../shared/src/helpers/files.js';
import { warn } from '../../shared/src/helpers/logging.js';
import { sonarjs } from './proto/analyze-project.js';

const { FilesystemCacheMode } = sonarjs.analyzeproject.v1;
type CacheMode = 'record' | 'replay';

function normalizeCacheMode(mode: number | null | undefined): CacheMode {
  switch (mode) {
    case FilesystemCacheMode.FILESYSTEM_CACHE_MODE_RECORD:
      return 'record';
    case FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY:
      return 'replay';
    default:
      throw new InvalidAnalyzeProjectRequestError('filesystem_cache.mode must be RECORD or REPLAY');
  }
}

function beginFilesystemCacheAnalysis(
  request: AnalyzeProjectProtoRequest,
  mode: CacheMode | undefined,
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
    mode,
    // Rules are unpacked into this temporary directory. Their files must use the native
    // filesystem; project files outside it remain subject to archive recording/replay.
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

function beginAnalysisMetadata(
  request: AnalyzeProjectProtoRequest,
  mode: CacheMode | undefined,
): ProgramSelectionArchive | undefined {
  const analysisMetadataPath = request.filesystemCache?.analysisMetadataPath;
  if (!analysisMetadataPath) {
    return undefined;
  }
  const baseDir = request.configuration?.baseDir;
  if (!baseDir) {
    throw new InvalidAnalyzeProjectRequestError('configuration.base_dir is required');
  }
  const metadata = new ProgramSelectionArchive(
    analysisMetadataPath,
    normalizeToAbsolutePath(baseDir),
    mode,
  );
  if (request.configuration) {
    metadata.recordConfiguration(request.configuration as unknown as Record<string, unknown>);
  }
  return metadata;
}

function endAnalysisSessions(
  programSelection: ProgramSelectionArchive | undefined,
  filesystemCacheSession: FsCacheSession | undefined,
): void {
  try {
    programSelection?.end();
  } catch (error) {
    warn(`Could not persist SonarJS analysis metadata: ${error}`);
  } finally {
    filesystemCacheSession?.end();
  }
}

export type WorkerData = {
  debugMemory: boolean;
};

async function handleProjectAnalysis(
  request: AnalyzeProjectProtoRequest,
  workerData: WorkerData,
  incrementalResultsChannel?: (result: AnalyzeProjectIncrementalEvent) => void,
): Promise<RequestResult<AnalyzeProjectResponse | void>> {
  const cacheMode = request.filesystemCache
    ? normalizeCacheMode(request.filesystemCache.mode)
    : undefined;
  const hasFilesystemArchive = Boolean(request.filesystemCache?.archivePath);
  const hasAnalysisMetadata = Boolean(request.filesystemCache?.analysisMetadataPath);
  if (hasFilesystemArchive !== hasAnalysisMetadata) {
    throw new InvalidAnalyzeProjectRequestError(
      'A filesystem archive and analysis metadata must be supplied together',
    );
  }
  const originalConfiguration = request.configuration ? { ...request.configuration } : undefined;
  let filesystemCacheSession = beginFilesystemCacheAnalysis(request, cacheMode);
  let programSelection: ProgramSelectionArchive | undefined;
  try {
    programSelection = beginAnalysisMetadata(request, cacheMode);
    const restoredConfiguration = programSelection?.restoredConfiguration();
    if (restoredConfiguration && request.configuration) {
      // Preserve the SQAA request's base directory, file scope, and runtime paths.
      Object.assign(request.configuration, restoredConfiguration);
    }
    return await withAnalysisCancellation(async () => {
      logHeapStatistics(workerData?.debugMemory);
      let sanitizedInput = await normalizeAnalyzeProjectRequest(request);
      if (
        cacheMode === 'replay' &&
        programSelection &&
        sanitizedInput.rules.length > 0 &&
        !sanitizedInput.configuration.disableTypeChecking
      ) {
        const unsupportedFiles = filesWithoutRecordedProgramOutcome(
          Object.keys(sourceFileStore.getFiles()) as NormalizedAbsolutePath[],
          programSelection,
          getJsTsConfigFields(sanitizedInput.configuration),
        );
        if (unsupportedFiles.length > 0) {
          warn(
            `Unsupported SonarJS context for ${unsupportedFiles.join(', ')}: no portable TypeScript program outcome; falling back to source-only analysis`,
          );
          endAnalysisSessions(programSelection, filesystemCacheSession);
          programSelection = undefined;
          filesystemCacheSession = undefined;
          request.configuration = originalConfiguration;
          request.filesystemCache = undefined;
          // Reinitialize the stores without the replay archive or recorded CI settings.
          // This follows the same tsconfig/orphan-program path as a request with no context.
          sanitizedInput = await normalizeAnalyzeProjectRequest(request);
        }
      }
      const wrappedIncrementalResultsChannel = incrementalResultsChannel
        ? (event: AnalyzeProjectIncrementalEvent['event']) =>
            incrementalResultsChannel({
              event,
              pathMap: sanitizedInput.pathMap,
            })
        : undefined;

      const output = await analyzeProject(
        {
          rules: sanitizedInput.rules,
          cssRules: sanitizedInput.cssRules,
          bundles: sanitizedInput.bundles,
          rulesWorkdir: sanitizedInput.rulesWorkdir,
          programSelection,
        },
        sanitizedInput.configuration,
        wrappedIncrementalResultsChannel,
      );
      logHeapStatistics(workerData?.debugMemory);
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

export async function handleAnalyzeProjectRequest(
  request: AnalyzeProjectRuntimeRequest,
  workerData: WorkerData,
  incrementalResultsChannel?: (result: AnalyzeProjectIncrementalEvent) => void,
): Promise<RequestResult<AnalyzeProjectResponse | void>> {
  try {
    switch (request.type) {
      case 'on-analyze-project': {
        return await handleProjectAnalysis(request.data, workerData, incrementalResultsChannel);
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
    return {
      type: 'failure',
      error: serializeError(err),
      reason: err instanceof InvalidAnalyzeProjectRequestError ? 'invalid_request' : 'runtime',
    };
  }
}
