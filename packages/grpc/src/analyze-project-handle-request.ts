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
import { ReplayProjectPaths } from './replay-project-paths.js';
import path from 'node:path';
import ts from 'typescript';

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
    restrictNativeReads: mode === 'replay',
    passthroughDirs: [
      // TypeScript's standard library belongs to this analyzer build, not the CI snapshot.
      path.dirname(ts.getDefaultLibFilePath({})),
      ...(request.bundles ?? []).map(bundle =>
        path.dirname(
          normalizeToAbsolutePath(bundle, normalizeToAbsolutePath(request.configuration!.baseDir!)),
        ),
      ),
      ...(request.rulesWorkdir
        ? [
            normalizeToAbsolutePath(
              request.rulesWorkdir,
              normalizeToAbsolutePath(request.configuration.baseDir),
            ),
          ]
        : []),
    ],
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
    normalizeToAbsolutePath(request.filesystemCache?.fallbackBaseDir || baseDir),
    mode,
    true,
    request.filesystemCache?.contextMetadata ?? undefined,
  );
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

type AnalysisSessions = {
  filesystemCacheSession?: FsCacheSession;
  programSelection?: ProgramSelectionArchive;
  paths?: ReplayProjectPaths;
};

function beginAnalysisSessions(
  request: AnalyzeProjectProtoRequest,
  cacheMode: CacheMode | undefined,
  sessions: AnalysisSessions,
): void {
  try {
    // Read metadata before installing project filesystem replay: the metadata itself is a
    // native runtime artifact, and its root determines the namespace of every observation.
    sessions.programSelection = beginAnalysisMetadata(request, cacheMode);
    if (cacheMode === 'replay') {
      sessions.paths = new ReplayProjectPaths(request);
      const recordedBaseDir = sessions.programSelection?.replayBaseDir();
      if (!recordedBaseDir || !path.isAbsolute(recordedBaseDir)) {
        warn(
          'Unsupported SonarJS context: no compatible recorded project base directory; falling back to source-only analysis',
        );
        sessions.programSelection = undefined;
        sessions.paths.restoreSourceOnlyRequest();
        return;
      }
      sessions.paths.useRecordedBaseDir(recordedBaseDir, file =>
        sessions.programSelection!.canonicalRequestedFile(file),
      );
    }
    sessions.filesystemCacheSession = beginFilesystemCacheAnalysis(request, cacheMode);
  } catch (error) {
    if (cacheMode === 'replay' && !(error instanceof InvalidAnalyzeProjectRequestError)) {
      throw new InvalidAnalyzeProjectRequestError('Invalid restored JavaScript context', {
        cause: error,
      });
    }
    throw error;
  }
}

async function normalizeProjectInput(
  request: AnalyzeProjectProtoRequest,
  cacheMode: CacheMode | undefined,
  sessions: AnalysisSessions,
) {
  const restoredConfiguration = sessions.programSelection?.restoredConfiguration();
  if (restoredConfiguration && request.configuration) {
    // Configuration is evaluated in its original CI namespace. Submitted contents, rules,
    // scanner file types and runtime paths still belong to the current request.
    Object.assign(request.configuration, restoredConfiguration);
  }
  const input = await normalizeAnalyzeProjectRequest(request);
  sessions.paths?.restoreResponsePaths(input.pathMap);
  if (
    cacheMode !== 'replay' ||
    !sessions.programSelection ||
    input.rules.length === 0 ||
    input.configuration.disableTypeChecking
  ) {
    return input;
  }
  const unsupportedFiles = filesWithoutRecordedProgramOutcome(
    Object.keys(sourceFileStore.getFiles()) as NormalizedAbsolutePath[],
    sessions.programSelection,
    getJsTsConfigFields(input.configuration),
  );
  if (unsupportedFiles.length === 0) {
    return input;
  }
  warn(
    `Unsupported SonarJS context for ${unsupportedFiles.join(', ')}: no portable TypeScript program outcome; falling back to source-only analysis`,
  );
  endAnalysisSessions(sessions.programSelection, sessions.filesystemCacheSession);
  sessions.programSelection = undefined;
  sessions.filesystemCacheSession = undefined;
  sessions.paths!.restoreSourceOnlyRequest();
  // Reinitialize the stores without the replay archive or recorded CI settings.
  // This follows the same tsconfig/orphan-program path as a request with no context.
  const fallback = await normalizeAnalyzeProjectRequest(request);
  sessions.paths!.restoreResponsePaths(fallback.pathMap);
  return fallback;
}

async function analyzeNormalizedProject(
  input: Awaited<ReturnType<typeof normalizeAnalyzeProjectRequest>>,
  programSelection: ProgramSelectionArchive | undefined,
  incrementalResultsChannel?: (result: AnalyzeProjectIncrementalEvent) => void,
) {
  const wrappedIncrementalResultsChannel = incrementalResultsChannel
    ? (event: AnalyzeProjectIncrementalEvent['event']) =>
        incrementalResultsChannel({
          event,
          pathMap: input.pathMap,
        })
    : undefined;
  const output = await analyzeProject(
    {
      rules: input.rules,
      cssRules: input.cssRules,
      bundles: input.bundles,
      rulesWorkdir: input.rulesWorkdir,
      programSelection,
    },
    input.configuration,
    wrappedIncrementalResultsChannel,
  );
  return { output, pathMap: input.pathMap };
}

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
  const sessions: AnalysisSessions = {};
  try {
    beginAnalysisSessions(request, cacheMode, sessions);
    return await withAnalysisCancellation(async () => {
      logHeapStatistics(workerData?.debugMemory);
      const input = await normalizeProjectInput(request, cacheMode, sessions);
      const result = await analyzeNormalizedProject(
        input,
        sessions.programSelection,
        incrementalResultsChannel,
      );
      logHeapStatistics(workerData?.debugMemory);
      return {
        type: 'success',
        result,
      };
    });
  } finally {
    endAnalysisSessions(sessions.programSelection, sessions.filesystemCacheSession);
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
