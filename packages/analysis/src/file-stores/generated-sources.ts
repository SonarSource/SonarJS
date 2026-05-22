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
import type { FileStore } from './store-type.js';
import type { NormalizedAbsolutePath } from '../../../shared/src/helpers/files.js';
import { getAnalyzableFilesConfigKey, type Configuration } from '../common/configuration.js';
import type { AnalyzableFiles } from '../projectAnalysis.js';
import { dependencyManifestStore } from './dependency-manifests.js';
import {
  GENERATED_SOURCE_WATCHED_FILENAMES,
  type GeneratedSourceFamily,
} from '../jsts/rules/helpers/generated-sources/index.js';
import { deriveGeneratedSources } from '../jsts/rules/helpers/generated-sources/derive.js';

class GeneratedSourceStore implements FileStore {
  private baseDir: NormalizedAbsolutePath | undefined = undefined;
  private canAccessFileSystem: boolean | undefined = undefined;
  private analyzableFilesConfigKey: string | undefined = undefined;
  private familyByFile = new Map<NormalizedAbsolutePath, GeneratedSourceFamily>();
  private configPaths = new Set<NormalizedAbsolutePath>();
  private outputDirectories = new Set<NormalizedAbsolutePath>();

  async isInitialized(configuration: Configuration) {
    this.dirtyCachesIfNeeded(configuration);
    return this.baseDir !== undefined;
  }

  getFamily(filePath: NormalizedAbsolutePath): GeneratedSourceFamily | undefined {
    return this.familyByFile.get(filePath);
  }

  dirtyCachesIfNeeded(configuration: Configuration) {
    const { baseDir, canAccessFileSystem, fsEvents } = configuration;
    const analyzableFilesConfigKey = getAnalyzableFilesConfigKey(configuration);
    if (baseDir !== this.baseDir || canAccessFileSystem !== this.canAccessFileSystem) {
      this.clearCache();
      return;
    }

    if (analyzableFilesConfigKey !== this.analyzableFilesConfigKey) {
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
    this.clearDerivedState();
  }

  setup(configuration: Configuration) {
    this.baseDir = configuration.baseDir;
    this.canAccessFileSystem = configuration.canAccessFileSystem;
    this.analyzableFilesConfigKey = getAnalyzableFilesConfigKey(configuration);
    this.clearDerivedState();
  }

  async processFile(
    _filename: NormalizedAbsolutePath,
    _configuration: Configuration,
  ): Promise<void> {
    // Generated-source detection is derived from project metadata during postProcess.
  }

  async postProcess(configuration: Configuration, analyzableFiles?: AnalyzableFiles) {
    // `postProcess` may run after a cache clear, so restore the current config identity first
    // without routing through `setup()`, which also clears derived state for a fresh scan.
    if (
      this.baseDir === undefined ||
      this.canAccessFileSystem === undefined ||
      this.analyzableFilesConfigKey === undefined
    ) {
      this.baseDir = configuration.baseDir;
      this.canAccessFileSystem = configuration.canAccessFileSystem;
      this.analyzableFilesConfigKey = getAnalyzableFilesConfigKey(configuration);
    }

    const { baseDir, canAccessFileSystem } = this;
    if (!baseDir || !canAccessFileSystem) {
      return;
    }

    const derived = await deriveGeneratedSources(
      baseDir,
      dependencyManifestStore.getPackageJsons(),
      analyzableFiles
        ? new Set(Object.keys(analyzableFiles) as NormalizedAbsolutePath[])
        : undefined,
    );
    // Generated-source tagging must stay aligned with the analyzer's real file scope
    // so configurable suffixes and exclusions win over detector-local heuristics.
    this.familyByFile = filterAnalyzableGeneratedFiles(derived.familyByFile, analyzableFiles);
    this.configPaths = derived.configPaths;
    this.outputDirectories = derived.outputDirectories;
  }

  private isRelevantEvent(filename: NormalizedAbsolutePath) {
    const eventBaseName = basename(filename).toLowerCase();
    if (
      eventBaseName === 'package.json' ||
      GENERATED_SOURCE_WATCHED_FILENAMES.includes(eventBaseName)
    ) {
      return true;
    }

    if (this.configPaths.has(filename) || this.familyByFile.has(filename)) {
      return true;
    }

    return [...this.outputDirectories].some(
      directory => filename === directory || filename.startsWith(`${directory}/`),
    );
  }

  private clearDerivedState() {
    this.familyByFile.clear();
    this.configPaths.clear();
    this.outputDirectories.clear();
  }
}

function filterAnalyzableGeneratedFiles(
  familyByFile: ReadonlyMap<NormalizedAbsolutePath, GeneratedSourceFamily>,
  analyzableFiles: AnalyzableFiles | undefined,
) {
  if (!analyzableFiles) {
    return new Map(familyByFile);
  }

  const filtered = new Map<NormalizedAbsolutePath, GeneratedSourceFamily>();
  for (const [filePath, family] of familyByFile) {
    if (Object.hasOwn(analyzableFiles, filePath)) {
      filtered.set(filePath, family);
    }
  }
  return filtered;
}

export const generatedSourceStore = new GeneratedSourceStore();
