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
import { basename, extname } from 'node:path/posix';
import type { FileStore } from './store-type.js';
import { getProjectFileDiscoveryConfigKey, type Configuration } from '../common/configuration.js';
import type { AnalyzableFiles } from '../projectAnalysis.js';
import { type NormalizedAbsolutePath } from '../../../shared/src/helpers/files.js';
import { dependencyManifestStore } from './dependency-manifests.js';
import { getGeneratedSourceWatchedFilenames } from '../jsts/rules/helpers/generated-sources/index.js';
import { isPreloadableDependencyManifestPath } from '../jsts/rules/helpers/dependency-manifests/index.js';
import { deriveGeneratedSources } from '../jsts/rules/helpers/generated-sources/derive.js';
import {
  createEmptyGeneratedSourcesTelemetry,
  type GeneratedSourcesTelemetry,
} from '../generated-source-telemetry.js';
import {
  buildGeneratedSourceObservability,
  createGeneratedSourceDetectionLogKey,
  createGeneratedSourceObservabilityLogKey,
  logGeneratedSourceDetectionInfo,
  logMatchedGeneratedSourceFiles,
  logGeneratedSourceObservability,
} from './generated-sources-observability.js';

class GeneratedSourceStore implements FileStore {
  private baseDir: NormalizedAbsolutePath | undefined = undefined;
  private canAccessFileSystem: boolean | undefined = undefined;
  private derivedConfigKey: string | undefined = undefined;
  private projectFileDiscoveryConfigKey: string | undefined = undefined;
  private derivedMetadataInitialized = false;
  private derivedFamilyByFile = new Map<NormalizedAbsolutePath, string>();
  private configPaths = new Set<NormalizedAbsolutePath>();
  private watchedOutputPaths = new Set<NormalizedAbsolutePath>();
  private lastLoggedGeneratedSourceDetectionKey: string | undefined = undefined;
  private readonly generatedSourceDetectionInfoBaseDirs = new Set<NormalizedAbsolutePath>();
  // Preserve the last logged fingerprint across cache invalidations so repeated analyses only
  // re-emit observability logs when the content changes.
  private lastLoggedObservabilityKey: string | undefined = undefined;

  async isInitialized(configuration: Configuration, _inputFiles?: AnalyzableFiles) {
    if (!configuration.detectGeneratedCode) {
      this.clearCache();
      return true;
    }

    this.dirtyCachesIfNeeded(configuration);
    return this.baseDir !== undefined;
  }

  getFamily(filePath: NormalizedAbsolutePath): string | undefined {
    return this.derivedFamilyByFile.get(filePath);
  }

  observeGeneratedSources(
    configuration: Configuration,
    analyzableFiles: AnalyzableFiles,
  ): GeneratedSourcesTelemetry {
    if (!configuration.detectGeneratedCode) {
      return createEmptyGeneratedSourcesTelemetry();
    }

    const observability = buildGeneratedSourceObservability(
      this.derivedFamilyByFile,
      filterAnalyzableGeneratedFiles(this.derivedFamilyByFile, analyzableFiles),
      configuration,
    );
    const baseDir = this.baseDir ?? configuration.baseDir;
    const detectionLogKey = createGeneratedSourceDetectionLogKey(baseDir, observability);
    if (detectionLogKey !== this.lastLoggedGeneratedSourceDetectionKey) {
      this.lastLoggedGeneratedSourceDetectionKey = detectionLogKey;
      if (detectionLogKey !== undefined) {
        if (!this.generatedSourceDetectionInfoBaseDirs.has(baseDir)) {
          logGeneratedSourceDetectionInfo();
          this.generatedSourceDetectionInfoBaseDirs.add(baseDir);
        }
        logMatchedGeneratedSourceFiles(observability);
      }
    }

    const observabilityKey = createGeneratedSourceObservabilityLogKey(baseDir, observability);
    if (observabilityKey !== this.lastLoggedObservabilityKey) {
      this.lastLoggedObservabilityKey = observabilityKey;
      logGeneratedSourceObservability(baseDir, observability);
    }

    return observability.telemetry;
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
  }

  clearCache() {
    this.baseDir = undefined;
    this.canAccessFileSystem = undefined;
    this.derivedConfigKey = undefined;
    this.projectFileDiscoveryConfigKey = undefined;
    this.derivedMetadataInitialized = false;
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

  async postProcess(configuration: Configuration, _inputFiles?: AnalyzableFiles) {
    if (!configuration.detectGeneratedCode) {
      this.clearCache();
      return;
    }

    if (
      this.baseDir === undefined ||
      this.canAccessFileSystem === undefined ||
      this.derivedConfigKey === undefined ||
      this.projectFileDiscoveryConfigKey === undefined
    ) {
      this.setup(configuration);
    }

    const { baseDir, canAccessFileSystem } = this;
    if (!baseDir || !canAccessFileSystem || this.derivedMetadataInitialized) {
      return;
    }

    const derived = await deriveGeneratedSources(
      baseDir,
      dependencyManifestStore.getPackageJsons(),
      {
        sourceFileMatcher: createConfiguredGeneratedSourceFileMatcher(configuration),
      },
    );
    this.derivedFamilyByFile = new Map(derived.familyByFile);
    this.configPaths = derived.configPaths;
    this.watchedOutputPaths = derived.watchedOutputPaths;
    this.derivedMetadataInitialized = true;
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

    if (this.configPaths.has(filename) || this.derivedFamilyByFile.has(filename)) {
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
    this.derivedFamilyByFile = new Map();
    this.configPaths = new Set();
    this.watchedOutputPaths = new Set();
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
  analyzableFiles: AnalyzableFiles,
) {
  const filtered = new Map<NormalizedAbsolutePath, string>();
  for (const [filePath, family] of familyByFile) {
    if (Object.hasOwn(analyzableFiles, filePath)) {
      filtered.set(filePath, family);
    }
  }
  return filtered;
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
