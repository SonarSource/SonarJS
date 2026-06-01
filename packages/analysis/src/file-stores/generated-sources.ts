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
import type { Configuration } from '../common/configuration.js';
import type { AnalyzableFiles } from '../projectAnalysis.js';
import type { NormalizedAbsolutePath } from '../../../shared/src/helpers/files.js';
import {
  getAnalyzableFilesConfigKey,
  getProjectFileDiscoveryConfigKey,
} from '../common/configuration.js';
import { dependencyManifestStore } from './dependency-manifests.js';
import { GENERATED_SOURCE_WATCHED_FILENAMES } from '../jsts/rules/helpers/generated-sources/index.js';
import { isPreloadableDependencyManifestPath } from '../jsts/rules/helpers/dependency-manifests/index.js';
import { deriveGeneratedSources } from '../jsts/rules/helpers/generated-sources/derive.js';

const ALL_FILES_REQUEST_KEY = 'all-files';
const EXPLICIT_FILE_SET_REQUEST_KEY_PREFIX = 'explicit';

type RequestFilesKey = string | undefined;

class GeneratedSourceStore implements FileStore {
  private baseDir: NormalizedAbsolutePath | undefined = undefined;
  private canAccessFileSystem: boolean | undefined = undefined;
  private analyzableFilesConfigKey: string | undefined = undefined;
  private projectFileDiscoveryConfigKey: string | undefined = undefined;
  private activeRequestFilesKey: RequestFilesKey = undefined;
  private requestFilesKey: RequestFilesKey = undefined;
  private derivedFamilyByFile = new Map<NormalizedAbsolutePath, string>();
  private familyByFile = new Map<NormalizedAbsolutePath, string>();
  private resolvedFiles = new Set<NormalizedAbsolutePath>();
  private configPaths = new Set<NormalizedAbsolutePath>();
  private watchedOutputPaths = new Set<NormalizedAbsolutePath>();

  async isInitialized(configuration: Configuration, inputFiles?: AnalyzableFiles) {
    this.dirtyCachesIfNeeded(configuration);
    const requestFilesKey = getRequestFilesKey(configuration.canAccessFileSystem, inputFiles);
    this.activeRequestFilesKey = requestFilesKey;
    if (this.baseDir === undefined) {
      return false;
    }

    if (requestFilesKey === this.requestFilesKey) {
      return true;
    }

    if (requestFilesKey === undefined) {
      return false;
    }

    this.refreshFilteredState(inputFiles, requestFilesKey);
    return true;
  }

  getFamily(filePath: NormalizedAbsolutePath): string | undefined {
    return this.familyByFile.get(filePath);
  }

  dirtyCachesIfNeeded(configuration: Configuration) {
    const { baseDir, canAccessFileSystem, fsEvents } = configuration;
    if (baseDir !== this.baseDir || canAccessFileSystem !== this.canAccessFileSystem) {
      this.clearCache();
      return;
    }

    if (getAnalyzableFilesConfigKey(configuration) !== this.analyzableFilesConfigKey) {
      this.clearCache();
      return;
    }

    if (getProjectFileDiscoveryConfigKey(configuration) !== this.projectFileDiscoveryConfigKey) {
      this.clearCache();
      return;
    }

    for (const filename of fsEvents) {
      if (this.isRelevantEvent(filename)) {
        this.clearCache();
        return;
      }
    }
  }

  clearCache() {
    this.baseDir = undefined;
    this.canAccessFileSystem = undefined;
    this.analyzableFilesConfigKey = undefined;
    this.projectFileDiscoveryConfigKey = undefined;
    this.activeRequestFilesKey = undefined;
    this.clearDerivedState();
  }

  setup(configuration: Configuration) {
    this.baseDir = configuration.baseDir;
    this.canAccessFileSystem = configuration.canAccessFileSystem;
    this.analyzableFilesConfigKey = getAnalyzableFilesConfigKey(configuration);
    this.projectFileDiscoveryConfigKey = getProjectFileDiscoveryConfigKey(configuration);
    this.clearDerivedState();
  }

  async processFile(
    _filename: NormalizedAbsolutePath,
    _configuration: Configuration,
  ): Promise<void> {
    // Generated-source detection is derived from project metadata during postProcess.
  }

  async postProcess(configuration: Configuration, analyzableFiles?: AnalyzableFiles) {
    if (
      this.baseDir === undefined ||
      this.canAccessFileSystem === undefined ||
      this.analyzableFilesConfigKey === undefined
    ) {
      this.baseDir = configuration.baseDir;
      this.canAccessFileSystem = configuration.canAccessFileSystem;
      this.analyzableFilesConfigKey = getAnalyzableFilesConfigKey(configuration);
      this.projectFileDiscoveryConfigKey = getProjectFileDiscoveryConfigKey(configuration);
    }

    const { baseDir, canAccessFileSystem } = this;
    if (!baseDir || !canAccessFileSystem) {
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
    this.resolvedFiles = new Set(this.derivedFamilyByFile.keys());
    this.configPaths = derived.configPaths;
    this.watchedOutputPaths = derived.watchedOutputPaths;
    this.refreshFilteredState(
      analyzableFiles,
      this.activeRequestFilesKey ?? getRequestFilesKey(canAccessFileSystem, analyzableFiles),
    );
  }

  private isRelevantEvent(filename: NormalizedAbsolutePath) {
    const eventBaseName = basename(filename).toLowerCase();
    if (
      isPreloadableDependencyManifestPath(filename) ||
      GENERATED_SOURCE_WATCHED_FILENAMES.includes(eventBaseName)
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
  }

  private refreshFilteredState(
    analyzableFiles: AnalyzableFiles | undefined,
    requestFilesKey: RequestFilesKey,
  ) {
    this.requestFilesKey = requestFilesKey;
    this.familyByFile = filterAnalyzableGeneratedFiles(this.derivedFamilyByFile, analyzableFiles);
  }
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

function getRequestFilesKey(
  canAccessFileSystem: boolean,
  analyzableFiles?: AnalyzableFiles,
): RequestFilesKey {
  if (!analyzableFiles) {
    return canAccessFileSystem ? ALL_FILES_REQUEST_KEY : undefined;
  }

  const filePaths = Object.keys(analyzableFiles).sort((left, right) => left.localeCompare(right));
  const hash = createHash('sha256');
  for (const filePath of filePaths) {
    hash.update(filePath);
    hash.update('\0');
  }

  return `${EXPLICIT_FILE_SET_REQUEST_KEY_PREFIX}:${filePaths.length}:${hash.digest('hex')}`;
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
