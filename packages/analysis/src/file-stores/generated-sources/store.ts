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
import { basename } from 'node:path/posix';
import type { FileStore } from '../store-type.js';
import {
  getProjectFileDiscoveryConfigKey,
  isJsTsFile,
  type Configuration,
} from '../../common/configuration.js';
import type { AnalyzableFiles } from '../../projectAnalysis.js';
import {
  dirnamePath,
  readFile,
  type File,
  type NormalizedAbsolutePath,
} from '../../../../shared/src/helpers/files.js';
import { getGeneratedSourceWatchedFilenames } from './detectors/index.js';
import {
  isPreloadableDependencyManifestPath,
  PACKAGE_JSON,
} from '../../jsts/rules/helpers/dependency-manifests/index.js';
import type { GeneratedSourceProjectSnapshot } from './contracts.js';
import { deriveGeneratedSources } from './derive.js';
import { collectGeneratedSourceDeclaredPreloadPaths } from './preload-paths.js';
import {
  createEmptyGeneratedSourcesTelemetry,
  type GeneratedSourcesTelemetry,
} from './telemetry.js';
import {
  buildGeneratedSourceObservability,
  createGeneratedSourceDetectionLogKey,
  createGeneratedSourceObservabilityLogKey,
  logGeneratedSourceDetectionInfo,
  logMatchedGeneratedSourceFiles,
  logGeneratedSourceObservability,
} from './observability.js';
import { shouldCaptureGeneratedSourceSnapshotPath } from './snapshot-files.js';

export class GeneratedSourceStore implements FileStore {
  private baseDir: NormalizedAbsolutePath | undefined = undefined;
  private canAccessFileSystem: boolean | undefined = undefined;
  private derivedConfigKey: string | undefined = undefined;
  private projectFileDiscoveryConfigKey: string | undefined = undefined;
  private derivedMetadataInitialized = false;
  private derivedFamilyByFile = new Map<NormalizedAbsolutePath, string>();
  private configPaths = new Set<NormalizedAbsolutePath>();
  private watchedConfigPaths = new Set<NormalizedAbsolutePath>();
  private preloadedFiles = new Map<NormalizedAbsolutePath, File>();
  private sourceFiles = new Set<NormalizedAbsolutePath>();
  private walkedDirectories = new Set<NormalizedAbsolutePath>();
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

    if (!configuration.canAccessFileSystem) {
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
    this.clearSnapshotState();
  }

  setup(configuration: Configuration) {
    this.baseDir = configuration.baseDir;
    this.canAccessFileSystem = configuration.canAccessFileSystem;
    this.derivedConfigKey = getGeneratedSourceConfigKey(configuration);
    this.projectFileDiscoveryConfigKey = getProjectFileDiscoveryConfigKey(configuration);
    this.walkedDirectories.add(configuration.baseDir);
  }

  async processFile(filename: NormalizedAbsolutePath, configuration: Configuration): Promise<void> {
    if (isJsTsFile(filename, configuration)) {
      this.sourceFiles.add(filename);
    }

    if (this.canAccessFileSystem === false) {
      return;
    }

    if (basename(filename).toLowerCase() === PACKAGE_JSON) {
      this.preloadedFiles.set(filename, {
        content: await readFile(filename),
        path: filename,
      });
      return;
    }

    if (!shouldCaptureGeneratedSourceSnapshotPath(filename, configuration)) {
      return;
    }

    this.preloadedFiles.set(filename, {
      content: await readFile(filename),
      path: filename,
    });
  }

  processDirectory(dir: NormalizedAbsolutePath) {
    this.walkedDirectories.add(dir);
  }

  async postProcess(configuration: Configuration) {
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

    const { baseDir } = this;
    if (!baseDir || this.derivedMetadataInitialized) {
      return;
    }

    try {
      const projectSnapshot = this.createProjectSnapshot();
      const packageJsons = collectPackageJsons(projectSnapshot.preloadedFiles);
      this.watchedConfigPaths = await collectGeneratedSourceDeclaredPreloadPaths(
        baseDir,
        packageJsons,
      );
      const derived = await deriveGeneratedSources(baseDir, packageJsons, {
        projectSnapshot,
        sourceFileMatcher: (filePath: NormalizedAbsolutePath) =>
          isJsTsFile(filePath, configuration),
      });
      this.derivedFamilyByFile = new Map(derived.familyByFile);
      this.configPaths = derived.configPaths;
      this.watchedOutputPaths = derived.watchedOutputPaths;
      this.derivedMetadataInitialized = true;
    } finally {
      this.clearSnapshotState();
    }
  }

  private isRelevantEvent(
    filename: NormalizedAbsolutePath,
    generatedSourceWatchedFilenames: readonly string[],
  ) {
    const eventBaseName = basename(filename).toLowerCase();
    if (
      isPreloadableDependencyManifestPath(filename) ||
      generatedSourceWatchedFilenames.includes(eventBaseName) ||
      this.watchedConfigPaths.has(filename)
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
    this.watchedConfigPaths = new Set();
    this.watchedOutputPaths = new Set();
  }

  private clearSnapshotState() {
    this.preloadedFiles = new Map();
    this.sourceFiles = new Set();
    this.walkedDirectories = new Set();
  }

  private createProjectSnapshot(): GeneratedSourceProjectSnapshot {
    return {
      directories: this.walkedDirectories,
      preloadedFiles: this.preloadedFiles,
      sourceFiles: this.sourceFiles,
    };
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

function collectPackageJsons(preloadedFiles: ReadonlyMap<NormalizedAbsolutePath, File>) {
  const packageJsons = new Map<NormalizedAbsolutePath, File>();

  for (const [filePath, file] of preloadedFiles) {
    if (basename(filePath).toLowerCase() === PACKAGE_JSON) {
      packageJsons.set(dirnamePath(filePath), file);
    }
  }

  return packageJsons;
}
