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
  normalizeToAbsolutePath,
  type NormalizedAbsolutePath,
} from '../../../../../../shared/src/helpers/files.js';
import type {
  DerivedGeneratedSources,
  GeneratedSourceFamily,
  GeneratedSourceFileMatcher,
} from './contracts.js';
import {
  addFamilyFiles,
  createDerivedGeneratedSources,
  extractFlagValuesFromTokens,
  isDirectory,
  isFile,
  isSourceFile,
  listSourceFilesInDirectory,
  resolveLiteralPath,
  safeStat,
} from './shared.js';
import type { DependenciesList } from '../dependency-manifests/resolvers/types.js';
import type { TaskInvocation } from './task-invocations.js';
export type ResolvedGeneratedOutputs = {
  filePaths: Set<NormalizedAbsolutePath>;
  outputDirectories: Set<NormalizedAbsolutePath>;
};

type TaskInvocationMatcher = (taskInvocation: TaskInvocation) => boolean;
type ExistingPathKind = 'file' | 'directory';

type ToolEvidenceOptions = {
  getDependencies: () => DependenciesList;
  taskInvocations: readonly TaskInvocation[];
  dependencyName?: string;
  matchesTaskInvocation: TaskInvocationMatcher;
};

type ResolvePathsFromTaskInvocationsOptions = {
  baseDir: NormalizedAbsolutePath;
  packageDir: NormalizedAbsolutePath;
  taskInvocations: readonly TaskInvocation[];
  matchesTaskInvocation: TaskInvocationMatcher;
  flags: string[];
  kind: ExistingPathKind;
};

type ResolveConfigPathsOptions = {
  baseDir: NormalizedAbsolutePath;
  packageDir: NormalizedAbsolutePath;
  taskInvocations: readonly TaskInvocation[];
  matchesTaskInvocation: TaskInvocationMatcher;
  flags: string[];
  fallbackBasenames: readonly string[];
};

export function hasToolEvidence({
  getDependencies,
  taskInvocations,
  dependencyName,
  matchesTaskInvocation,
}: ToolEvidenceOptions) {
  if (taskInvocations.some(matchesTaskInvocation)) {
    return true;
  }

  return dependencyName ? getDependencies().has(dependencyName) : false;
}

export async function resolveConfigPaths({
  baseDir,
  packageDir,
  taskInvocations,
  matchesTaskInvocation,
  flags,
  fallbackBasenames,
}: ResolveConfigPathsOptions) {
  const explicitConfigPaths = await resolveExistingPathsFromTaskInvocations({
    baseDir,
    packageDir,
    taskInvocations,
    matchesTaskInvocation,
    flags,
    kind: 'file',
  });

  if (explicitConfigPaths.size > 0) {
    return explicitConfigPaths;
  }

  return resolveExistingSiblingPaths(packageDir, fallbackBasenames, 'file');
}

export async function resolveOutputDirectoriesFromTaskInvocations({
  baseDir,
  packageDir,
  taskInvocations,
  matchesTaskInvocation,
  flags,
}: Omit<ResolvePathsFromTaskInvocationsOptions, 'kind'>) {
  return resolveExistingPathsFromTaskInvocations({
    baseDir,
    packageDir,
    taskInvocations,
    matchesTaskInvocation,
    flags,
    kind: 'directory',
  });
}

export async function deriveSourcesFromOutputDirectories(
  family: GeneratedSourceFamily,
  outputDirectories: Iterable<NormalizedAbsolutePath>,
  recursive: boolean,
  sourceFileMatcher?: GeneratedSourceFileMatcher,
): Promise<DerivedGeneratedSources> {
  const derived = createDerivedGeneratedSources();

  for (const outputDirectory of [...outputDirectories].sort((left, right) =>
    left.localeCompare(right),
  )) {
    derived.outputDirectories.add(outputDirectory);
    addFamilyFiles(
      family,
      await listAcceptedGeneratedFilesInDirectory(outputDirectory, recursive, sourceFileMatcher),
      derived,
    );
  }

  return derived;
}

export async function resolveGeneratedOutputsFromLiteralPaths(
  baseDir: NormalizedAbsolutePath,
  declaredFromDir: NormalizedAbsolutePath,
  outputPaths: Iterable<string>,
  recursive: boolean,
  sourceFileMatcher?: GeneratedSourceFileMatcher,
): Promise<ResolvedGeneratedOutputs> {
  const resolvedOutputs: ResolvedGeneratedOutputs = {
    filePaths: new Set<NormalizedAbsolutePath>(),
    outputDirectories: new Set<NormalizedAbsolutePath>(),
  };

  for (const outputPath of outputPaths) {
    const resolvedPath = resolveLiteralPath(outputPath, declaredFromDir, baseDir);
    if (resolvedPath) {
      await addResolvedGeneratedOutput(resolvedOutputs, resolvedPath, recursive, sourceFileMatcher);
    }
  }

  return resolvedOutputs;
}

async function addResolvedGeneratedOutput(
  resolvedOutputs: ResolvedGeneratedOutputs,
  resolvedPath: NormalizedAbsolutePath,
  recursive: boolean,
  sourceFileMatcher?: GeneratedSourceFileMatcher,
) {
  const stats = await safeStat(resolvedPath);
  if (!stats) {
    return;
  }

  if (stats.isFile()) {
    if (isAcceptedGeneratedFile(resolvedPath, sourceFileMatcher)) {
      resolvedOutputs.filePaths.add(resolvedPath);
    }
    return;
  }

  if (!stats.isDirectory()) {
    return;
  }

  resolvedOutputs.outputDirectories.add(resolvedPath);
  for (const childFile of await listAcceptedGeneratedFilesInDirectory(
    resolvedPath,
    recursive,
    sourceFileMatcher,
  )) {
    resolvedOutputs.filePaths.add(childFile);
  }
}

function isAcceptedGeneratedFile(
  filePath: NormalizedAbsolutePath,
  sourceFileMatcher?: GeneratedSourceFileMatcher,
) {
  return isSourceFile(filePath, sourceFileMatcher);
}

async function listAcceptedGeneratedFilesInDirectory(
  outputDirectory: NormalizedAbsolutePath,
  recursive: boolean,
  sourceFileMatcher?: GeneratedSourceFileMatcher,
) {
  return listSourceFilesInDirectory(outputDirectory, recursive, sourceFileMatcher);
}

async function resolveExistingPathsFromTaskInvocations({
  baseDir,
  packageDir,
  taskInvocations,
  matchesTaskInvocation,
  flags,
  kind,
}: ResolvePathsFromTaskInvocationsOptions) {
  const resolvedPaths = new Set<NormalizedAbsolutePath>();

  for (const taskInvocation of taskInvocations) {
    if (!matchesTaskInvocation(taskInvocation) || !taskInvocation.tokens) {
      continue;
    }

    for (const token of extractFlagValuesFromTokens(taskInvocation.tokens, flags)) {
      const resolvedPath = resolveLiteralPath(token, packageDir, baseDir);
      if (resolvedPath && (await matchesExistingPathKind(resolvedPath, kind))) {
        resolvedPaths.add(resolvedPath);
      }
    }
  }

  return resolvedPaths;
}

async function resolveExistingSiblingPaths(
  packageDir: NormalizedAbsolutePath,
  basenames: readonly string[],
  kind: ExistingPathKind,
) {
  const resolvedPaths = new Set<NormalizedAbsolutePath>();

  for (const basename of basenames) {
    const resolvedPath = normalizeToAbsolutePath(basename, packageDir);
    if (await matchesExistingPathKind(resolvedPath, kind)) {
      resolvedPaths.add(resolvedPath);
    }
  }

  return resolvedPaths;
}

async function matchesExistingPathKind(path: NormalizedAbsolutePath, kind: ExistingPathKind) {
  return kind === 'file' ? isFile(path) : isDirectory(path);
}
