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
import { createHash } from 'node:crypto';
import { basename, extname } from 'node:path/posix';
import type { FileStore } from './store-type.js';
import {
  getAnalyzableFilesConfigKey,
  getProjectFileDiscoveryConfigKey,
  type Configuration,
} from '../common/configuration.js';
import type { AnalyzableFiles, FileStoreRequestContext } from '../projectAnalysis.js';
import { type NormalizedAbsolutePath } from '../../../shared/src/helpers/files.js';
import { dependencyManifestStore } from './dependency-manifests.js';
import { getGeneratedSourceWatchedFilenames } from '../jsts/rules/helpers/generated-sources/index.js';
import { isPreloadableDependencyManifestPath } from '../jsts/rules/helpers/dependency-manifests/index.js';
import { deriveGeneratedSources } from '../jsts/rules/helpers/generated-sources/derive.js';
import {
  cloneGeneratedSourcesTelemetry,
  createEmptyGeneratedSourcesTelemetry,
  type GeneratedSourcesTelemetry,
} from '../generated-source-telemetry.js';
import {
  buildGeneratedSourceObservability,
  createGeneratedSourceObservabilityLogKey,
  logGeneratedSourceObservability,
} from './generated-sources-observability.js';

const ALL_FILES_REQUEST_KEY = 'all-files';
const EXPLICIT_FILE_SET_REQUEST_KEY_PREFIX = 'explicit';

type RequestFilesKey = string | undefined;

/**
 * Maintains two generated-source caches:
 * - the detector cache, which stores the project-level outputs of generated-source detection
 * - the match cache, which stores the current analyzable subset exposed by the store
 */
class GeneratedSourceStore implements FileStore {
  private readonly explicitRequestFilesKeys = new WeakMap<FileStoreRequestContext, string>();
  private baseDir: NormalizedAbsolutePath | undefined = undefined;
  private canAccessFileSystem: boolean | undefined = undefined;
  private derivedConfigKey: string | undefined = undefined;
  private projectFileDiscoveryConfigKey: string | undefined = undefined;
  private analyzableFilesConfigKey: string | undefined = undefined;
  private needsFilteredRefresh = false;
  private derivedMetadataInitialized = false;
  private activeRequestFilesKey: RequestFilesKey = undefined;
  private requestFilesKey: RequestFilesKey = undefined;
  // Detector cache: generated-source families derived from project metadata.
  private derivedFamilyByFile = new Map<NormalizedAbsolutePath, string>();
  // Match cache: detector results filtered to the current analyzable/requested files.
  private familyByFile = new Map<NormalizedAbsolutePath, string>();
  private resolvedFiles = new Set<NormalizedAbsolutePath>();
  private configPaths = new Set<NormalizedAbsolutePath>();
  private watchedOutputPaths = new Set<NormalizedAbsolutePath>();
  private observabilityTelemetry = createEmptyGeneratedSourcesTelemetry();
  // Preserve the last logged fingerprint across cache invalidations so repeated analyses only
  // re-emit observability logs when the content changes.
  private lastLoggedObservabilityKey: string | undefined = undefined;

  async isInitialized(configuration: Configuration, requestContext?: FileStoreRequestContext) {
    this.dirtyCachesIfNeeded(configuration);
    const requestFilesKey = this.getRequestFilesKey(
      configuration.canAccessFileSystem,
      requestContext,
    );
    this.activeRequestFilesKey = requestFilesKey;
    if (this.baseDir === undefined) {
      return false;
    }

    if (this.needsFilteredRefresh) {
      if (requestFilesKey === undefined || requestContext?.analyzableFiles === undefined) {
        return false;
      }

      this.analyzableFilesConfigKey = getAnalyzableFilesConfigKey(configuration);
      this.refreshFilteredState(configuration, requestContext, requestFilesKey);
      this.needsFilteredRefresh = false;
      return true;
    }

    if (requestFilesKey === this.requestFilesKey) {
      return true;
    }

    if (requestFilesKey === undefined) {
      return false;
    }

    this.refreshFilteredState(configuration, requestContext, requestFilesKey);
    return true;
  }

  getFamily(filePath: NormalizedAbsolutePath): string | undefined {
    return this.familyByFile.get(filePath);
  }

  getObservabilityTelemetry(): GeneratedSourcesTelemetry {
    return cloneGeneratedSourcesTelemetry(this.observabilityTelemetry);
  }

  dirtyCachesIfNeeded(configuration: Configuration) {
    const { baseDir, canAccessFileSystem, fsEvents } = configuration;
    if (baseDir !== this.baseDir || canAccessFileSystem !== this.canAccessFileSystem) {
      this.clearCache();
      return;
    }

    if (getGeneratedSourceConfigKey(configuration) !== this.derivedConfigKey) {
      this.clearCache();
      return;
    }

    if (getProjectFileDiscoveryConfigKey(configuration) !== this.projectFileDiscoveryConfigKey) {
      this.clearCache();
      return;
    }

    const generatedSourceWatchedFilenames = getGeneratedSourceWatchedFilenames();
    for (const filename of fsEvents) {
      if (this.isRelevantEvent(filename, generatedSourceWatchedFilenames)) {
        this.clearCache();
        return;
      }
    }

    if (getAnalyzableFilesConfigKey(configuration) !== this.analyzableFilesConfigKey) {
      this.needsFilteredRefresh = true;
    }
  }

  clearCache() {
    this.baseDir = undefined;
    this.canAccessFileSystem = undefined;
    this.derivedConfigKey = undefined;
    this.projectFileDiscoveryConfigKey = undefined;
    this.analyzableFilesConfigKey = undefined;
    this.needsFilteredRefresh = false;
    this.derivedMetadataInitialized = false;
    this.activeRequestFilesKey = undefined;
    this.clearDerivedState();
  }

  setup(configuration: Configuration) {
    this.baseDir = configuration.baseDir;
    this.canAccessFileSystem = configuration.canAccessFileSystem;
    this.derivedConfigKey = getGeneratedSourceConfigKey(configuration);
    this.projectFileDiscoveryConfigKey = getProjectFileDiscoveryConfigKey(configuration);
  }

  async processFile(
    _filename: NormalizedAbsolutePath,
    _configuration: Configuration,
  ): Promise<void> {
    // The detector cache is derived from project metadata during postProcess().
  }

  async postProcess(configuration: Configuration, requestContext?: FileStoreRequestContext) {
    if (
      this.baseDir === undefined ||
      this.canAccessFileSystem === undefined ||
      this.derivedConfigKey === undefined ||
      this.projectFileDiscoveryConfigKey === undefined
    ) {
      this.baseDir = configuration.baseDir;
      this.canAccessFileSystem = configuration.canAccessFileSystem;
      this.derivedConfigKey = getGeneratedSourceConfigKey(configuration);
      this.projectFileDiscoveryConfigKey = getProjectFileDiscoveryConfigKey(configuration);
    }

    const { baseDir, canAccessFileSystem } = this;
    if (!baseDir || !canAccessFileSystem) {
      this.analyzableFilesConfigKey = getAnalyzableFilesConfigKey(configuration);
      this.needsFilteredRefresh = false;
      return;
    }

    if (!this.derivedMetadataInitialized) {
      const derived = await deriveGeneratedSources(
        baseDir,
        dependencyManifestStore.getPackageJsons(),
        {
          sourceFileMatcher: createConfiguredGeneratedSourceFileMatcher(configuration),
        },
      );
      this.derivedFamilyByFile = new Map(derived.familyByFile);
      this.resolvedFiles = new Set(this.derivedFamilyByFile.keys());
      this.configPaths = derived.configPaths;
      this.watchedOutputPaths = derived.watchedOutputPaths;
      this.derivedMetadataInitialized = true;
    }

    this.analyzableFilesConfigKey = getAnalyzableFilesConfigKey(configuration);
    this.refreshFilteredState(
      configuration,
      requestContext,
      this.activeRequestFilesKey ?? this.getRequestFilesKey(canAccessFileSystem, requestContext),
    );
    this.needsFilteredRefresh = false;
  }

  private isRelevantEvent(
    filename: NormalizedAbsolutePath,
    generatedSourceWatchedFilenames: readonly string[],
  ) {
    const eventBaseName = basename(filename).toLowerCase();
    if (
      isPreloadableDependencyManifestPath(filename) ||
      generatedSourceWatchedFilenames.includes(eventBaseName)
    ) {
      return true;
    }

    if (
      this.configPaths.has(filename) ||
      this.familyByFile.has(filename) ||
      this.resolvedFiles.has(filename)
    ) {
      return true;
    }

    for (const watchedOutputPath of this.watchedOutputPaths) {
      if (filename === watchedOutputPath || filename.startsWith(`${watchedOutputPath}/`)) {
        return true;
      }
    }

    return false;
  }

  private clearDerivedState() {
    this.requestFilesKey = undefined;
    this.derivedFamilyByFile = new Map();
    this.familyByFile = new Map();
    this.resolvedFiles = new Set();
    this.configPaths = new Set();
    this.watchedOutputPaths = new Set();
    this.observabilityTelemetry = createEmptyGeneratedSourcesTelemetry();
  }

  private getRequestFilesKey(
    canAccessFileSystem: boolean,
    requestContext?: FileStoreRequestContext,
  ): RequestFilesKey {
    if (!requestContext?.isExplicitRequest) {
      return canAccessFileSystem ? ALL_FILES_REQUEST_KEY : undefined;
    }

    const cachedRequestFilesKey = this.explicitRequestFilesKeys.get(requestContext);
    if (cachedRequestFilesKey !== undefined) {
      return cachedRequestFilesKey;
    }

    const requestFilesKey = createExplicitRequestFilesKey(getRequestedFilePaths(requestContext));
    this.explicitRequestFilesKeys.set(requestContext, requestFilesKey);
    return requestFilesKey;
  }

  private refreshFilteredState(
    configuration: Configuration,
    requestContext: FileStoreRequestContext | undefined,
    requestFilesKey: RequestFilesKey,
  ) {
    if (!this.baseDir) {
      return;
    }

    this.requestFilesKey = requestFilesKey;
    const analyzableFiles = requestContext?.analyzableFiles;
    // Refresh only the match cache from the stable detector cache.
    this.familyByFile = filterAnalyzableGeneratedFiles(this.derivedFamilyByFile, analyzableFiles);
    const observability = buildGeneratedSourceObservability(
      this.derivedFamilyByFile,
      this.familyByFile,
      configuration,
      requestContext?.isExplicitRequest ? getRequestedFilePaths(requestContext) : undefined,
    );
    this.observabilityTelemetry = observability.telemetry;
    const observabilityKey = createGeneratedSourceObservabilityLogKey(this.baseDir, observability);
    if (observabilityKey !== this.lastLoggedObservabilityKey) {
      this.lastLoggedObservabilityKey = observabilityKey;
      logGeneratedSourceObservability(this.baseDir, observability);
    }
  }
}

function getGeneratedSourceConfigKey(configuration: Configuration) {
  return JSON.stringify({
    jsSuffixes: configuration.jsSuffixes,
    tsSuffixes: configuration.tsSuffixes,
  });
}

function filterAnalyzableGeneratedFiles(
  familyByFile: ReadonlyMap<NormalizedAbsolutePath, string>,
  analyzableFiles: AnalyzableFiles | undefined,
) {
  if (!analyzableFiles) {
    return new Map(familyByFile);
  }

  const filtered = new Map<NormalizedAbsolutePath, string>();
  for (const [filePath, family] of familyByFile) {
    if (Object.hasOwn(analyzableFiles, filePath)) {
      filtered.set(filePath, family);
    }
  }
  return filtered;
}

function getRequestedFilePaths(
  requestContext: FileStoreRequestContext,
): ReadonlySet<NormalizedAbsolutePath> {
  if (requestContext.requestedFilePaths) {
    return requestContext.requestedFilePaths;
  }

  return new Set(Object.keys(requestContext.analyzableFiles ?? {}) as NormalizedAbsolutePath[]);
}

function createExplicitRequestFilesKey(filePaths: ReadonlySet<NormalizedAbsolutePath>) {
  const sortedFilePaths = [...filePaths].sort((left, right) => left.localeCompare(right));
  const hash = createHash('sha256');
  for (const filePath of sortedFilePaths) {
    hash.update(filePath);
    hash.update('\0');
  }

  return `${EXPLICIT_FILE_SET_REQUEST_KEY_PREFIX}:${sortedFilePaths.length}:${hash.digest('hex')}`;
}

function createConfiguredGeneratedSourceFileMatcher(configuration: Configuration) {
  const supportedExtensions = new Set(
    [...configuration.jsSuffixes, ...configuration.tsSuffixes].map(extension =>
      extension.toLowerCase(),
    ),
  );
  return (filePath: NormalizedAbsolutePath) =>
    supportedExtensions.has(extname(filePath).toLowerCase());
}

export const generatedSourceStore = new GeneratedSourceStore();
