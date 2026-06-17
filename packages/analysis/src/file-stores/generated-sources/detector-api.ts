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
} from '../../../../shared/src/helpers/files.js';
import type { GeneratedSourceFileMatcher, GeneratedSourceProjectSnapshot } from './contracts.js';
import { extractFlagValuesFromTokens, isSourceFile, resolveLiteralPath } from './shared.js';
import type { DependenciesList } from '../../jsts/rules/helpers/dependency-manifests/resolvers/types.js';
import type { TaskInvocation } from './task-invocations.js';
import {
  hasDirectoryInSnapshot,
  hasFileInSnapshot,
  listSourceFilesInSnapshot,
} from './snapshot.js';
export type ResolvedGeneratedOutputs = {
  filePaths: Set<NormalizedAbsolutePath>;
  outputDirectories: Set<NormalizedAbsolutePath>;
  watchedOutputPaths: Set<NormalizedAbsolutePath>;
};

type TaskInvocationMatcher = (taskInvocation: TaskInvocation) => boolean;
type ExistingPathKind = 'file' | 'directory';

type ToolEvidenceOptions = {
  hasDependency?: (dependencyName: string) => boolean;
  getDependencies?: () => DependenciesList;
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
};

type ResolveConfigPathsOptions = {
  baseDir: NormalizedAbsolutePath;
  packageDir: NormalizedAbsolutePath;
  taskInvocations: readonly TaskInvocation[];
  matchesTaskInvocation: TaskInvocationMatcher;
  flags: string[];
  fallbackBasenames: readonly string[];
  projectSnapshot?: GeneratedSourceProjectSnapshot;
};

export function hasToolEvidence({
  hasDependency,
  getDependencies,
  taskInvocations,
  dependencyName,
  matchesTaskInvocation,
}: ToolEvidenceOptions) {
  if (taskInvocations.some(matchesTaskInvocation)) {
    return true;
  }

  if (!dependencyName) {
    return false;
  }

  if (hasDependency) {
    return hasDependency(dependencyName);
  }

  return getDependencies ? getDependencies().has(dependencyName) : false;
}

export function resolveConfigPaths({
  baseDir,
  packageDir,
  taskInvocations,
  matchesTaskInvocation,
  flags,
  fallbackBasenames,
  projectSnapshot,
}: ResolveConfigPathsOptions) {
  const declaredConfigPaths = resolveDeclaredPathsFromTaskInvocations({
    baseDir,
    packageDir,
    taskInvocations,
    matchesTaskInvocation,
    flags,
  });

  if (declaredConfigPaths.size > 0) {
    return declaredConfigPaths;
  }

  if (projectSnapshot) {
    const snapshotPaths = resolveExistingSiblingPathsFromSnapshot(
      packageDir,
      fallbackBasenames,
      'file',
      projectSnapshot,
    );
    if (snapshotPaths.size > 0) {
      return snapshotPaths;
    }
  }

  return new Set<NormalizedAbsolutePath>();
}

export function resolveGeneratedOutputsFromLiteralPaths(
  baseDir: NormalizedAbsolutePath,
  declaredFromDirs: NormalizedAbsolutePath | readonly NormalizedAbsolutePath[],
  outputPaths: Iterable<string>,
  recursive: boolean,
  sourceFileMatcher?: GeneratedSourceFileMatcher,
  projectSnapshot?: GeneratedSourceProjectSnapshot,
): ResolvedGeneratedOutputs {
  const resolvedOutputs: ResolvedGeneratedOutputs = {
    filePaths: new Set<NormalizedAbsolutePath>(),
    outputDirectories: new Set<NormalizedAbsolutePath>(),
    watchedOutputPaths: new Set<NormalizedAbsolutePath>(),
  };
  const candidateDirs = Array.isArray(declaredFromDirs) ? declaredFromDirs : [declaredFromDirs];

  for (const outputPath of outputPaths) {
    const seenResolvedPaths = new Set<NormalizedAbsolutePath>();
    for (const declaredFromDir of candidateDirs) {
      const resolvedPath = resolveLiteralPath(outputPath, declaredFromDir, baseDir);
      if (!resolvedPath || seenResolvedPaths.has(resolvedPath)) {
        continue;
      }
      seenResolvedPaths.add(resolvedPath);
      if (
        addResolvedGeneratedOutput(
          resolvedOutputs,
          resolvedPath,
          recursive,
          sourceFileMatcher,
          projectSnapshot,
        )
      ) {
        break;
      }
    }
  }

  return resolvedOutputs;
}

function addResolvedGeneratedOutput(
  resolvedOutputs: ResolvedGeneratedOutputs,
  resolvedPath: NormalizedAbsolutePath,
  recursive: boolean,
  sourceFileMatcher?: GeneratedSourceFileMatcher,
  projectSnapshot?: GeneratedSourceProjectSnapshot,
) {
  resolvedOutputs.watchedOutputPaths.add(resolvedPath);
  if (!projectSnapshot) {
    return false;
  }

  if (projectSnapshot.sourceFiles.has(resolvedPath)) {
    if (isSourceFile(resolvedPath, sourceFileMatcher)) {
      resolvedOutputs.filePaths.add(resolvedPath);
      return true;
    }
    return false;
  }

  if (!hasDirectoryInSnapshot(resolvedPath, projectSnapshot)) {
    return false;
  }

  resolvedOutputs.outputDirectories.add(resolvedPath);
  const childFiles = listSourceFilesInSnapshot(
    resolvedPath,
    recursive,
    sourceFileMatcher,
    projectSnapshot,
  );
  for (const childFile of childFiles) {
    resolvedOutputs.filePaths.add(childFile);
  }
  return childFiles.length > 0;
}

export function resolveDeclaredPathsFromTaskInvocations({
  baseDir,
  packageDir,
  taskInvocations,
  matchesTaskInvocation,
  flags,
}: ResolvePathsFromTaskInvocationsOptions) {
  const resolvedPaths = new Set<NormalizedAbsolutePath>();

  for (const taskInvocation of taskInvocations) {
    if (!matchesTaskInvocation(taskInvocation)) {
      continue;
    }

    for (const token of extractFlagValuesFromTokens(taskInvocation.args, flags)) {
      const resolvedPath = resolveLiteralPath(token, packageDir, baseDir);
      if (resolvedPath) {
        resolvedPaths.add(resolvedPath);
      }
    }
  }

  return resolvedPaths;
}

function resolveExistingSiblingPathsFromSnapshot(
  packageDir: NormalizedAbsolutePath,
  basenames: readonly string[],
  kind: ExistingPathKind,
  projectSnapshot: GeneratedSourceProjectSnapshot,
) {
  const resolvedPaths = new Set<NormalizedAbsolutePath>();

  for (const basename of basenames) {
    const resolvedPath = normalizeToAbsolutePath(basename, packageDir);
    if (
      kind === 'file'
        ? hasFileInSnapshot(resolvedPath, projectSnapshot)
        : hasDirectoryInSnapshot(resolvedPath, projectSnapshot)
    ) {
      resolvedPaths.add(resolvedPath);
    }
  }

  return resolvedPaths;
}
