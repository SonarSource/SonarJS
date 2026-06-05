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
  getFilterPathParams,
  getProjectFileDiscoveryConfigKey,
  type Configuration,
} from '../common/configuration.js';
import { classifyFilePath } from '../common/filter/filter-path.js';
import type { AnalyzableFiles } from '../projectAnalysis.js';
import {
  normalizeToAbsolutePath,
  type NormalizedAbsolutePath,
} from '../../../shared/src/helpers/files.js';
import { debug, info } from '../../../shared/src/helpers/logging.js';
import { dependencyManifestStore } from './dependency-manifests.js';
import { getGeneratedSourceWatchedFilenames } from '../jsts/rules/helpers/generated-sources/index.js';
import { isPreloadableDependencyManifestPath } from '../jsts/rules/helpers/dependency-manifests/index.js';
import { deriveGeneratedSources } from '../jsts/rules/helpers/generated-sources/derive.js';
import { relativeToAncestorPath } from '../jsts/rules/helpers/files.js';
import {
  cloneGeneratedSourcesTelemetry,
  createEmptyGeneratedSourcesTelemetry,
  type GeneratedSourceFamilyTelemetry,
  type GeneratedSourcesTelemetry,
} from '../telemetry.js';

const DEFAULT_DTS_EXCLUSION_PATTERN = '**/*.d.ts';
const OBSERVABILITY_SAMPLE_LIMIT = 3;
const ALL_FILES_REQUEST_KEY = 'all-files';
const EXPLICIT_FILE_SET_REQUEST_KEY_PREFIX = 'explicit';

type RequestFilesKey = string | undefined;

type GeneratedSourceFamilyObservability = GeneratedSourceFamilyTelemetry & {
  excludedPaths: NormalizedAbsolutePath[];
  outOfScopePaths: NormalizedAbsolutePath[];
};

type GeneratedSourceObservability = {
  telemetry: GeneratedSourcesTelemetry;
  families: GeneratedSourceFamilyObservability[];
  ignoredDefaultDtsFamilies: Array<{
    family: string;
    filePaths: NormalizedAbsolutePath[];
  }>;
};

class GeneratedSourceStore implements FileStore {
  private readonly explicitRequestFilesKeys = new WeakMap<AnalyzableFiles, string>();
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
  private observabilityTelemetry = createEmptyGeneratedSourcesTelemetry();

  async isInitialized(configuration: Configuration, inputFiles?: AnalyzableFiles) {
    this.dirtyCachesIfNeeded(configuration);
    const requestFilesKey = this.getRequestFilesKey(configuration.canAccessFileSystem, inputFiles);
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

    this.refreshFilteredState(configuration, inputFiles, requestFilesKey);
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

    if (getAnalyzableFilesConfigKey(configuration) !== this.analyzableFilesConfigKey) {
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
      configuration,
      analyzableFiles,
      this.activeRequestFilesKey ?? this.getRequestFilesKey(canAccessFileSystem, analyzableFiles),
    );
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
    analyzableFiles?: AnalyzableFiles,
  ): RequestFilesKey {
    if (!analyzableFiles) {
      return canAccessFileSystem ? ALL_FILES_REQUEST_KEY : undefined;
    }

    const cachedRequestFilesKey = this.explicitRequestFilesKeys.get(analyzableFiles);
    if (cachedRequestFilesKey !== undefined) {
      return cachedRequestFilesKey;
    }

    const requestFilesKey = createExplicitRequestFilesKey(analyzableFiles);
    this.explicitRequestFilesKeys.set(analyzableFiles, requestFilesKey);
    return requestFilesKey;
  }

  private refreshFilteredState(
    configuration: Configuration,
    analyzableFiles: AnalyzableFiles | undefined,
    requestFilesKey: RequestFilesKey,
  ) {
    if (!this.baseDir) {
      return;
    }

    this.requestFilesKey = requestFilesKey;
    this.familyByFile = filterAnalyzableGeneratedFiles(this.derivedFamilyByFile, analyzableFiles);
    const observability = buildGeneratedSourceObservability(
      this.derivedFamilyByFile,
      this.familyByFile,
      configuration,
    );
    this.observabilityTelemetry = observability.telemetry;
    logGeneratedSourceObservability(this.baseDir, observability);
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

function createExplicitRequestFilesKey(analyzableFiles: AnalyzableFiles) {
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

function buildGeneratedSourceObservability(
  resolvedFamilyByFile: ReadonlyMap<NormalizedAbsolutePath, string>,
  taggedFamilyByFile: ReadonlyMap<NormalizedAbsolutePath, string>,
  configuration: Configuration,
): GeneratedSourceObservability {
  const filterPathParams = getFilterPathParams(configuration);
  const pathsByFamily = new Map<string, NormalizedAbsolutePath[]>();

  for (const [filePath, family] of sortPathEntries(resolvedFamilyByFile.entries())) {
    let familyPaths = pathsByFamily.get(family);
    if (!familyPaths) {
      familyPaths = [];
      pathsByFamily.set(family, familyPaths);
    }
    familyPaths.push(filePath);
  }

  const families: GeneratedSourceFamilyObservability[] = [];
  const ignoredDefaultDtsFamilies: GeneratedSourceObservability['ignoredDefaultDtsFamilies'] = [];

  for (const family of [...pathsByFamily.keys()].sort((left, right) => left.localeCompare(right))) {
    const filePaths = pathsByFamily.get(family) ?? [];
    if (
      shouldIgnoreDefaultDtsFamily(filePaths, taggedFamilyByFile, configuration, filterPathParams)
    ) {
      ignoredDefaultDtsFamilies.push({
        family,
        filePaths,
      });
      continue;
    }

    const familySummary: GeneratedSourceFamilyObservability = {
      family,
      resolvedFileCount: filePaths.length,
      taggedFileCount: 0,
      outOfScopeFileCount: 0,
      excludedFileCount: 0,
      excludedPaths: [],
      outOfScopePaths: [],
    };

    for (const filePath of filePaths) {
      if (taggedFamilyByFile.get(filePath) === family) {
        familySummary.taggedFileCount += 1;
        continue;
      }

      const pathClassification = classifyFilePath(filePath, filterPathParams);
      if (pathClassification.status === 'OUT_OF_SCOPE') {
        familySummary.outOfScopeFileCount += 1;
        familySummary.outOfScopePaths.push(filePath);
      } else {
        familySummary.excludedFileCount += 1;
        familySummary.excludedPaths.push(filePath);
      }
    }

    families.push(familySummary);
  }

  const telemetryFamilies: GeneratedSourceFamilyTelemetry[] = families.map(family => ({
    family: family.family,
    resolvedFileCount: family.resolvedFileCount,
    taggedFileCount: family.taggedFileCount,
    outOfScopeFileCount: family.outOfScopeFileCount,
    excludedFileCount: family.excludedFileCount,
  }));

  return {
    telemetry: {
      familyCount: telemetryFamilies.length,
      resolvedFileCount: telemetryFamilies.reduce(
        (count, family) => count + family.resolvedFileCount,
        0,
      ),
      taggedFileCount: telemetryFamilies.reduce(
        (count, family) => count + family.taggedFileCount,
        0,
      ),
      outOfScopeFileCount: telemetryFamilies.reduce(
        (count, family) => count + family.outOfScopeFileCount,
        0,
      ),
      excludedFileCount: telemetryFamilies.reduce(
        (count, family) => count + family.excludedFileCount,
        0,
      ),
      families: telemetryFamilies,
    },
    families,
    ignoredDefaultDtsFamilies,
  };
}

function shouldIgnoreDefaultDtsFamily(
  filePaths: readonly NormalizedAbsolutePath[],
  taggedFamilyByFile: ReadonlyMap<NormalizedAbsolutePath, string>,
  configuration: Configuration,
  filterPathParams: ReturnType<typeof getFilterPathParams>,
) {
  if (
    filePaths.length === 0 ||
    !configuration.jsTsExclusions.some(
      exclusion =>
        exclusion.pattern ===
        normalizeToAbsolutePath(DEFAULT_DTS_EXCLUSION_PATTERN, configuration.baseDir),
    )
  ) {
    return false;
  }

  return filePaths.every(filePath => {
    if (!filePath.endsWith('.d.ts') || taggedFamilyByFile.has(filePath)) {
      return false;
    }

    const pathClassification = classifyFilePath(filePath, filterPathParams);
    return pathClassification.status === 'MAIN' || pathClassification.status === 'TEST';
  });
}

function logGeneratedSourceObservability(
  baseDir: NormalizedAbsolutePath,
  observability: GeneratedSourceObservability,
) {
  if (observability.telemetry.familyCount > 0) {
    info(
      `Generated source observability: families=${observability.telemetry.familyCount}, resolvedFiles=${observability.telemetry.resolvedFileCount}, taggedFiles=${observability.telemetry.taggedFileCount}, outOfScopeFiles=${observability.telemetry.outOfScopeFileCount}, excludedFiles=${observability.telemetry.excludedFileCount}`,
    );
  }

  for (const family of observability.families) {
    info(
      `Generated source family=${family.family} resolvedFiles=${family.resolvedFileCount} taggedFiles=${family.taggedFileCount} outOfScopeFiles=${family.outOfScopeFileCount} excludedFiles=${family.excludedFileCount}`,
    );

    if (family.outOfScopePaths.length > 0) {
      debug(
        `Generated source family=${family.family} outOfScope sample=${formatSamplePaths(baseDir, family.outOfScopePaths)}`,
      );
    }

    if (family.excludedPaths.length > 0) {
      debug(
        `Generated source family=${family.family} excluded sample=${formatSamplePaths(baseDir, family.excludedPaths)}`,
      );
    }
  }

  for (const ignoredFamily of observability.ignoredDefaultDtsFamilies) {
    debug(
      `Generated source family=${ignoredFamily.family} ignored for observability because all resolved outputs are declaration files excluded by default ${DEFAULT_DTS_EXCLUSION_PATTERN}: ${formatSamplePaths(baseDir, ignoredFamily.filePaths)}`,
    );
  }
}

function formatSamplePaths(
  baseDir: NormalizedAbsolutePath,
  filePaths: readonly NormalizedAbsolutePath[],
) {
  const samplePaths = filePaths
    .slice(0, OBSERVABILITY_SAMPLE_LIMIT)
    .map(filePath => relativeToAncestorPath(filePath, baseDir) ?? filePath);
  const moreCount = filePaths.length - samplePaths.length;
  return moreCount > 0 ? `${samplePaths.join(', ')} (+${moreCount} more)` : samplePaths.join(', ');
}

function sortPathEntries<T>(entries: Iterable<[NormalizedAbsolutePath, T]>) {
  return [...entries].sort(([left], [right]) => left.localeCompare(right));
}
