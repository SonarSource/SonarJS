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
  dirnamePath,
  isRoot,
  type File,
  type NormalizedAbsolutePath,
} from '../../../../shared/src/helpers/files.js';
import type { PackageJson } from 'type-fest';
import type { DependenciesList } from '../../jsts/rules/helpers/dependency-manifests/resolvers/types.js';
import type {
  DerivedGeneratedSources,
  GeneratedSourceFileMatcher,
  GeneratedSourceProjectSnapshot,
} from './contracts.js';
import { GENERATED_SOURCE_DETECTORS } from './detectors/index.js';
import {
  collectGeneratedSourcePackageContexts,
  createGeneratedSourcePackageJsonMap,
  type GeneratedSourcePackageContext,
} from './package-contexts.js';
import { createDerivedGeneratedSources, mergeDerivedGeneratedSources } from './shared.js';

export async function deriveGeneratedSources(
  baseDir: NormalizedAbsolutePath,
  packageJsons: ReadonlyMap<NormalizedAbsolutePath, File>,
  options?: {
    projectSnapshot?: GeneratedSourceProjectSnapshot;
    sourceFileMatcher?: GeneratedSourceFileMatcher;
    packageContexts?: readonly GeneratedSourcePackageContext[];
  },
): Promise<DerivedGeneratedSources> {
  const derived = createDerivedGeneratedSources();
  if (GENERATED_SOURCE_DETECTORS.length === 0) {
    return derived;
  }

  const {
    projectSnapshot,
    sourceFileMatcher,
    packageContexts: providedPackageContexts,
  } = options ?? {};
  if (!projectSnapshot) {
    throw new Error('generated-source derivation requires a project snapshot');
  }

  const packageContexts =
    providedPackageContexts ?? (await collectGeneratedSourcePackageContexts(baseDir, packageJsons));
  const parsedPackageJsons = createGeneratedSourcePackageJsonMap(packageContexts);

  for (const { packageDir, packageJson, taskInvocations } of packageContexts) {
    let dependencyNames: Set<string> | undefined;
    let dependencies: DependenciesList | undefined;
    const hasGeneratedSourceDependency = (dependencyName: string) => {
      dependencyNames ??= collectGeneratedSourceDependencyNames(
        packageDir,
        baseDir,
        parsedPackageJsons,
        packageJson,
      );
      return dependencyNames.has(dependencyName);
    };
    const getGeneratedSourceDependencies = () => {
      dependencies ??= resolveGeneratedSourceDependencies(
        packageDir,
        baseDir,
        parsedPackageJsons,
        packageJson,
      );
      return dependencies;
    };
    for (const detector of GENERATED_SOURCE_DETECTORS) {
      mergeDerivedGeneratedSources(
        derived,
        await detector.detect({
          baseDir,
          packageDir,
          hasDependency: hasGeneratedSourceDependency,
          getDependencies: getGeneratedSourceDependencies,
          projectSnapshot,
          taskInvocations,
          sourceFileMatcher,
        }),
      );
    }
  }

  return derived;
}

function collectGeneratedSourceDependencyNames(
  packageDir: NormalizedAbsolutePath,
  baseDir: NormalizedAbsolutePath,
  packageJsons: ReadonlyMap<NormalizedAbsolutePath, PackageJson>,
  packageJson: PackageJson,
) {
  const dependencyNames = new Set<string>();

  for (const packageJsonManifest of getGeneratedSourcePackageJsonHierarchy(
    packageDir,
    baseDir,
    packageJsons,
    packageJson,
  )) {
    addPackageJsonDependencyNames(dependencyNames, packageJsonManifest);
  }

  return dependencyNames;
}

function resolveGeneratedSourceDependencies(
  packageDir: NormalizedAbsolutePath,
  baseDir: NormalizedAbsolutePath,
  packageJsons: ReadonlyMap<NormalizedAbsolutePath, PackageJson>,
  packageJson: PackageJson,
): DependenciesList {
  const dependencies: DependenciesList = new Map();

  for (const packageJsonManifest of getGeneratedSourcePackageJsonHierarchy(
    packageDir,
    baseDir,
    packageJsons,
    packageJson,
  )) {
    addPackageJsonDependencies(dependencies, packageJsonManifest);
  }

  return dependencies;
}

function getGeneratedSourcePackageJsonHierarchy(
  packageDir: NormalizedAbsolutePath,
  baseDir: NormalizedAbsolutePath,
  packageJsons: ReadonlyMap<NormalizedAbsolutePath, PackageJson>,
  currentPackageJson: PackageJson,
) {
  const manifests: PackageJson[] = [];
  let currentDir = packageDir;

  while (true) {
    const packageJson =
      currentDir === packageDir ? currentPackageJson : packageJsons.get(currentDir);
    if (packageJson) {
      manifests.push(packageJson);
    }

    if (currentDir === baseDir || isRoot(currentDir)) {
      return manifests;
    }

    currentDir = dirnamePath(currentDir);
  }
}

function addPackageJsonDependencies(dependencies: DependenciesList, packageJson: PackageJson) {
  for (const section of [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.peerDependencies,
    packageJson.optionalDependencies,
  ]) {
    if (!section) {
      continue;
    }

    for (const [name, version] of Object.entries(section)) {
      if (!dependencies.has(name)) {
        dependencies.set(name, typeof version === 'string' ? version : undefined);
      }
    }
  }
}

function addPackageJsonDependencyNames(dependencyNames: Set<string>, packageJson: PackageJson) {
  for (const section of [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.peerDependencies,
    packageJson.optionalDependencies,
  ]) {
    if (!section) {
      continue;
    }

    for (const dependencyName of Object.keys(section)) {
      dependencyNames.add(dependencyName);
    }
  }
}

export { extractFlagValues } from './shared.js';
