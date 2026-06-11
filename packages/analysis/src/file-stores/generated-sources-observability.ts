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
import {
  normalizeToAbsolutePath,
  type NormalizedAbsolutePath,
} from '../../../shared/src/helpers/files.js';
import { debug, info } from '../../../shared/src/helpers/logging.js';
import type { Configuration } from '../common/configuration.js';
import { matchesJsTsExclusion } from '../common/filter/filter-path.js';
import {
  type GeneratedSourceFamilyTelemetry,
  type GeneratedSourcesTelemetry,
} from '../generated-source-telemetry.js';
import { relativeToAncestorPath } from '../jsts/rules/helpers/files.js';

const DEFAULT_DTS_EXCLUSION_PATTERN = '**/*.d.ts';
const OBSERVABILITY_SAMPLE_LIMIT = 3;
const GENERATED_SOURCE_DETECTION_INFO =
  'Some of the project files were detected as generated source files. Enable debug logging to see which files matched. You can disable generated-source detection by setting sonar.javascript.detectGeneratedCode=false';

type GeneratedSourceFamilyObservability = GeneratedSourceFamilyTelemetry & {
  taggedPaths: NormalizedAbsolutePath[];
};

type GeneratedSourceObservability = {
  telemetry: GeneratedSourcesTelemetry;
  families: GeneratedSourceFamilyObservability[];
  ignoredDefaultDtsFamilies: Array<{
    family: string;
    filePaths: NormalizedAbsolutePath[];
  }>;
};

export function buildGeneratedSourceObservability(
  resolvedFamilyByFile: ReadonlyMap<NormalizedAbsolutePath, string>,
  taggedFamilyByFile: ReadonlyMap<NormalizedAbsolutePath, string>,
  configuration: Configuration,
): GeneratedSourceObservability {
  const pathsByFamily = collectGeneratedSourcePathsByFamily(resolvedFamilyByFile);
  const families: GeneratedSourceFamilyObservability[] = [];
  const ignoredDefaultDtsFamilies: GeneratedSourceObservability['ignoredDefaultDtsFamilies'] = [];

  for (const [family, filePaths] of [...pathsByFamily.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    if (shouldIgnoreDefaultDtsFamily(filePaths, taggedFamilyByFile, configuration)) {
      ignoredDefaultDtsFamilies.push({ family, filePaths });
      continue;
    }

    families.push(summarizeGeneratedSourceFamily(family, filePaths, taggedFamilyByFile));
  }

  const telemetryFamilies = families.map(toGeneratedSourceFamilyTelemetry);

  return {
    telemetry: aggregateGeneratedSourcesTelemetry(telemetryFamilies),
    families,
    ignoredDefaultDtsFamilies,
  };
}

export function logGeneratedSourceObservability(
  baseDir: NormalizedAbsolutePath,
  observability: GeneratedSourceObservability,
) {
  if (observability.telemetry.familyCount > 0) {
    info(
      `Generated source observability: families=${observability.telemetry.familyCount}, resolvedFiles=${observability.telemetry.resolvedFileCount}, taggedFiles=${observability.telemetry.taggedFileCount}`,
    );
  }

  for (const family of observability.families) {
    info(
      `Generated source family=${family.family} resolvedFiles=${family.resolvedFileCount} taggedFiles=${family.taggedFileCount}`,
    );

    if (family.taggedFileCount > 0) {
      debug(
        `Generated source family=${family.family} tagged sample=${formatSamplePaths(baseDir, family.taggedPaths)}`,
      );
    }
  }

  for (const ignoredFamily of observability.ignoredDefaultDtsFamilies) {
    debug(
      `Generated source family=${ignoredFamily.family} ignored for observability because all resolved outputs are declaration files excluded by default ${DEFAULT_DTS_EXCLUSION_PATTERN}: ${formatSamplePaths(baseDir, ignoredFamily.filePaths)}`,
    );
  }
}

export function createGeneratedSourceObservabilityLogKey(
  baseDir: NormalizedAbsolutePath,
  observability: GeneratedSourceObservability,
) {
  return JSON.stringify({
    baseDir,
    telemetry: observability.telemetry,
    families: observability.families.map(family => ({
      family: family.family,
      taggedCount: family.taggedPaths.length,
      taggedSample: family.taggedPaths.slice(0, OBSERVABILITY_SAMPLE_LIMIT),
    })),
    ignoredDefaultDtsFamilies: observability.ignoredDefaultDtsFamilies.map(family => ({
      family: family.family,
      fileCount: family.filePaths.length,
      fileSample: family.filePaths.slice(0, OBSERVABILITY_SAMPLE_LIMIT),
    })),
  });
}

export function createGeneratedSourceDetectionLogKey(
  baseDir: NormalizedAbsolutePath,
  observability: GeneratedSourceObservability,
) {
  if (observability.telemetry.taggedFileCount === 0) {
    return undefined;
  }

  return JSON.stringify({
    baseDir,
    taggedFingerprint: createPathFingerprint(collectTaggedGeneratedSourcePaths(observability)),
  });
}

export function logGeneratedSourceDetectionInfo() {
  info(GENERATED_SOURCE_DETECTION_INFO);
}

export function logMatchedGeneratedSourceFiles(observability: GeneratedSourceObservability) {
  for (const filePath of collectTaggedGeneratedSourcePaths(observability)) {
    debug(
      `File ${filePath} was detected as generated source. (Disable detection with sonar.javascript.detectGeneratedCode=false)`,
    );
  }
}

function collectGeneratedSourcePathsByFamily(
  resolvedFamilyByFile: ReadonlyMap<NormalizedAbsolutePath, string>,
) {
  const pathsByFamily = new Map<string, NormalizedAbsolutePath[]>();

  for (const [filePath, family] of sortPathEntries(resolvedFamilyByFile.entries())) {
    const familyPaths = pathsByFamily.get(family);
    if (familyPaths) {
      familyPaths.push(filePath);
    } else {
      pathsByFamily.set(family, [filePath]);
    }
  }

  return pathsByFamily;
}

function summarizeGeneratedSourceFamily(
  family: string,
  filePaths: readonly NormalizedAbsolutePath[],
  taggedFamilyByFile: ReadonlyMap<NormalizedAbsolutePath, string>,
): GeneratedSourceFamilyObservability {
  const familySummary: GeneratedSourceFamilyObservability = {
    family,
    resolvedFileCount: filePaths.length,
    taggedFileCount: 0,
    taggedPaths: [],
  };

  for (const filePath of filePaths) {
    if (taggedFamilyByFile.get(filePath) === family) {
      familySummary.taggedFileCount += 1;
      familySummary.taggedPaths.push(filePath);
    }
  }

  return familySummary;
}

function toGeneratedSourceFamilyTelemetry(
  family: GeneratedSourceFamilyObservability,
): GeneratedSourceFamilyTelemetry {
  return {
    family: family.family,
    resolvedFileCount: family.resolvedFileCount,
    taggedFileCount: family.taggedFileCount,
  };
}

function aggregateGeneratedSourcesTelemetry(
  families: GeneratedSourceFamilyTelemetry[],
): GeneratedSourcesTelemetry {
  return {
    familyCount: families.length,
    resolvedFileCount: families.reduce((count, family) => count + family.resolvedFileCount, 0),
    taggedFileCount: families.reduce((count, family) => count + family.taggedFileCount, 0),
    families,
  };
}

function shouldIgnoreDefaultDtsFamily(
  filePaths: readonly NormalizedAbsolutePath[],
  taggedFamilyByFile: ReadonlyMap<NormalizedAbsolutePath, string>,
  configuration: Configuration,
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

    return matchesJsTsExclusion(filePath, configuration.jsTsExclusions);
  });
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

function collectTaggedGeneratedSourcePaths(observability: GeneratedSourceObservability) {
  return observability.families.flatMap(family => family.taggedPaths);
}

function createPathFingerprint(filePaths: readonly NormalizedAbsolutePath[]) {
  const hash = createHash('sha256');
  for (const filePath of filePaths) {
    hash.update(filePath);
    hash.update('\0');
  }
  return hash.digest('hex');
}
