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
import type { AnalyzableFile, AnalyzableFiles } from '../../projectAnalysis.js';
import {
  dirnamePath,
  type File,
  type NormalizedAbsolutePath,
} from '../../../../shared/src/helpers/files.js';
import type { DependencyManifestStore } from '../dependency-manifests.js';
import {
  getGeneratedSourceWatchedFilenames,
  shouldPreloadGeneratedSourcePath,
} from './detectors/index.js';
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
import { collectGeneratedSourceProjectSnapshotFromFileSystem } from './filesystem-snapshot.js';

type DependencyManifestLookup = Pick<DependencyManifestStore, 'getPackageJsons'>;

export class GeneratedSourceStore implements FileStore {
  constructor(private readonly dependencyManifestStore: DependencyManifestLookup) {}

  private baseDir: NormalizedAbsolutePath | undefined = undefined;
  private canAccessFileSystem: boolean | undefined = undefined;
  private derivedConfigKey: string | undefined = undefined;
  private projectFileDiscoveryConfigKey: string | undefined = undefined;
  private derivedMetadataInitialized = false;
  private derivedFamilyByFile = new Map<NormalizedAbsolutePath, string>();
  private configPaths = new Set<NormalizedAbsolutePath>();
  private packageJsons = new Map<NormalizedAbsolutePath, File>();
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
      return false;
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
    if (this.canAccessFileSystem !== false) {
      return;
    }

    if (isJsTsFile(filename, configuration)) {
      this.sourceFiles.add(filename);
    }
  }

  processDirectory(dir: NormalizedAbsolutePath) {
    if (this.canAccessFileSystem === false) {
      this.walkedDirectories.add(dir);
    }
  }

  async postProcess(configuration: Configuration, inputFiles?: AnalyzableFiles) {
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
      const projectSnapshot = await this.createProjectSnapshot(configuration, inputFiles);
      const derived = await deriveGeneratedSources(baseDir, this.packageJsons, {
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

  private clearSnapshotState() {
    this.packageJsons = new Map();
    this.preloadedFiles = new Map();
    this.sourceFiles = new Set();
    this.walkedDirectories = new Set();
  }

  private async createProjectSnapshot(
    configuration: Configuration,
    inputFiles?: AnalyzableFiles,
  ): Promise<GeneratedSourceProjectSnapshot> {
    if (this.canAccessFileSystem) {
      this.packageJsons = new Map(this.getDependencyPackageJsons());
      const snapshot = await collectGeneratedSourceProjectSnapshotFromFileSystem({
        baseDir: this.baseDir!,
        jsTsExclusions: configuration.jsTsExclusions,
        packageJsons: this.packageJsons,
        sourceFileMatcher: (filePath: NormalizedAbsolutePath) =>
          isJsTsFile(filePath, configuration),
      });
      this.preloadedFiles = new Map(snapshot.projectSnapshot.preloadedFiles);
      this.sourceFiles = new Set(snapshot.projectSnapshot.sourceFiles);
      this.walkedDirectories = new Set(snapshot.projectSnapshot.directories);
      return {
        directories: this.walkedDirectories,
        preloadedFiles: this.preloadedFiles,
        sourceFiles: this.sourceFiles,
      };
    }

    const availableInputFiles = createAvailableInputFiles(inputFiles);
    for (const [filePath, file] of availableInputFiles) {
      if (basename(filePath).toLowerCase() === PACKAGE_JSON) {
        this.packageJsons.set(dirnamePath(filePath), file);
      }

      if (
        shouldPreloadGeneratedSourcePath(filePath) ||
        basename(filePath).toLowerCase() === PACKAGE_JSON
      ) {
        this.preloadedFiles.set(filePath, file);
      }
    }

    for (const preloadPath of await collectGeneratedSourceDeclaredPreloadPaths(
      this.baseDir!,
      this.packageJsons,
    )) {
      const inputFile = availableInputFiles.get(preloadPath);
      if (inputFile && !this.preloadedFiles.has(preloadPath)) {
        this.preloadedFiles.set(preloadPath, inputFile);
      }
    }

    return {
      directories: this.walkedDirectories,
      preloadedFiles: this.preloadedFiles,
      sourceFiles: this.sourceFiles,
    };
  }

  private getDependencyPackageJsons() {
    try {
      return this.dependencyManifestStore.getPackageJsons();
    } catch {
      return new Map<NormalizedAbsolutePath, File>();
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

function createAvailableInputFiles(inputFiles?: AnalyzableFiles) {
  const availableInputFiles = new Map<NormalizedAbsolutePath, File>();

  for (const [filePath, file] of Object.entries(inputFiles ?? {}) as [
    NormalizedAbsolutePath,
    AnalyzableFile,
  ][]) {
    availableInputFiles.set(filePath, {
      content: file.fileContent,
      path: filePath,
    });
  }

  return availableInputFiles;
}
